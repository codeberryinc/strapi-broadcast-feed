import type { Core } from '@strapi/strapi';
import { BroadcastFeedConfig, FeedItem } from '../types'; // Import shared types

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  async fetchFeedItems(
    page = 1,
    pageSize = 10,
    fields?: string,
    populate?: Record<string, any>,
    filters?: Record<string, any> // Add filters here
  ) {
    const config = strapi.config.get('plugin::broadcast-feed') as BroadcastFeedConfig;
    const { collections } = config.feed;

    try {
      // Ensure filters always include a condition for published items
      const combinedFilters = {
        ...filters, // User-defined filters
        publishedAt: { $notNull: true }, // Enforce published filter
      };

      const results: FeedItem[][] = await Promise.all(
        collections.map(
          ({ uid }) =>
            strapi.db.query(uid).findMany({
              where: combinedFilters, // Apply filters here
              orderBy: { publishedAt: 'desc' },
              populate, // Pass parsed populate structure
            }) as Promise<FeedItem[]>
        )
      );

      const combinedFeed: FeedItem[] = results.flatMap((items, index) =>
        items.map((item) => ({
          ...item,
          documentId: item.documentId, // Use documentId here
          collectionType: collections[index].uid.split('::')[1].split('.')[0],
        }))
      );

      // Sort the feed by `publishedAt`
      combinedFeed.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      // Format the feed and include fields dynamically
      const formattedFeed = await Promise.all(
        combinedFeed.map(async (entry) => {
          const response: Record<string, any> = { documentId: entry.documentId }; // Use documentId

          // Include requested fields
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
                where: { documentId: entry.documentId }, // Use documentId in query
                populate,
              });

            Object.assign(response, extractNestedFields(fullEntry, populate));
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

  Object.keys(populateParams).forEach((field) => {
    if (field === 'populate') {
      // Skip over the "populate" key and directly process its children
      Object.assign(result, extractNestedFields(entry, populateParams[field]));
      return;
    }

    if (entry && entry[field] !== undefined) {
      const nestedParams = populateParams[field];

      if (typeof nestedParams === 'object' && Object.keys(nestedParams).length > 0) {
        result[field] = extractNestedFields(entry[field], nestedParams);
      } else {
        result[field] = entry[field];
      }
    }
  });

  return result;
};
