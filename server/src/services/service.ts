import type { Core } from '@strapi/strapi';
import { BroadcastFeedConfig, FeedItem } from '../types'; // Import shared types

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  async fetchFeedItems(page = 1, pageSize = 10, fields?: string, populate?: Record<string, any>) {
    const config = strapi.config.get('plugin.broadcast-feed') as BroadcastFeedConfig;
    const { collections } = config.feed;

    try {
      const results: FeedItem[][] = await Promise.all(
        collections.map(
          ({ uid }) =>
            strapi.db.query(uid).findMany({
              where: { publishedAt: { $notNull: true } },
              orderBy: { publishedAt: 'desc' },
              populate, // Use the parsed populate structure
            }) as Promise<FeedItem[]>
        )
      );

      const combinedFeed: FeedItem[] = results.flatMap((items, index) =>
        items.map((item) => ({
          ...item,
          collectionType: collections[index].uid.split('::')[1].split('.')[0],
        }))
      );

      // Sort the feed by `publishedAt`
      combinedFeed.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      // Format the feed and populate fields dynamically
      const formattedFeed = await Promise.all(
        combinedFeed.map(async (entry) => {
          const response: Record<string, any> = { id: entry.id };

          // Dynamically include requested fields
          if (fields) {
            const selectedFields = fields.split(',');
            selectedFields.forEach((field) => {
              if (entry[field] !== undefined) {
                response[field] = entry[field];
              }
            });
          } else {
            Object.keys(entry).forEach((field) => {
              response[field] = entry[field];
            });
          }

          // Populate relations dynamically
          if (populate) {
            const fullEntry = await strapi.db
              .query(`api::${entry.collectionType}.${entry.collectionType}`)
              .findOne({
                where: { id: entry.id },
                populate,
              });

            console.log('Full Entry with Populated Data:', JSON.stringify(fullEntry, null, 2));

            const extractedFields = extractNestedFields(fullEntry, populate);
            console.log('Extracted Fields:', JSON.stringify(extractedFields, null, 2));

            Object.assign(response, extractedFields);
          }

          return response;
        })
      );

      // Pagination
      const total = formattedFeed.length;
      const paginatedFeed = formattedFeed.slice((page - 1) * pageSize, page * pageSize);

      return {
        data: paginatedFeed,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total,
          },
        },
      };
    } catch (error) {
      strapi.log.error('Error fetching feed items:', error);
      throw new Error('Unable to fetch feed items');
    }
  },
});

export default service;

// Helper to extract nested fields dynamically
const extractNestedFields = (
  entry: Record<string, any>,
  populateParams: Record<string, any>
): Record<string, any> => {
  const result: Record<string, any> = {};

  console.log('Extract Nested Fields - Entry:', JSON.stringify(entry, null, 2));
  console.log('Extract Nested Fields - Populate Params:', JSON.stringify(populateParams, null, 2));

  Object.keys(populateParams).forEach((field) => {
    if (field === 'populate') {
      // Skip over the "populate" key and directly process its children
      console.log('Skipping "populate" key to process nested fields');
      Object.assign(result, extractNestedFields(entry, populateParams[field]));
      return;
    }

    if (entry && entry[field] !== undefined) {
      console.log(`Processing Field: ${field}`);
      const nestedParams = populateParams[field];

      if (typeof nestedParams === 'object' && Object.keys(nestedParams).length > 0) {
        console.log(`Recursively Processing Nested Field: ${field}`);
        result[field] = extractNestedFields(entry[field], nestedParams);
      } else {
        console.log(`Directly Assigning Field: ${field}`);
        result[field] = entry[field];
      }
    } else {
      console.log(`Field ${field} is Missing in Entry`);
    }
  });

  console.log('Extract Nested Fields - Result:', JSON.stringify(result, null, 2));
  return result;
};
