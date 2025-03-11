import type { Core } from '@strapi/strapi';
import { BroadcastFeedConfig, FeedItem } from '../types'; // Import shared types

const graphqlService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async fetchGraphQLFeedItems(page = 1, pageSize = 10, filters?: Record<string, any>) {
    const config = strapi.config.get('plugin::broadcast-feed') as BroadcastFeedConfig;
    const { collections } = config.feed;

    try {
      // Combine filters with a condition for published items
      const combinedFilters = {
        ...filters,
        publishedAt: { $notNull: true }, // Include only published items
      };

      // Fetch raw items and totals from all collections
      const results = await Promise.all(
        collections.map(async ({ uid }) => {
          const items = await strapi.db.query(uid).findMany({
            where: combinedFilters,
            orderBy: { publishedAt: 'desc' },
            limit: pageSize,
            offset: (page - 1) * pageSize,
            populate: true, // Automatically include relations
          });

          const total = await strapi.db.query(uid).count({ where: combinedFilters });

          // Log raw items fetched for debugging
          // console.log(`Fetched items for collection '${uid}':`, items);

          return { items, total, collectionType: uid.split('::')[1].split('.')[0] };
        })
      );

      // Combine items dynamically and structure with only relevant collections
      const combinedFeed = results.flatMap(({ items, collectionType }) =>
        items.map((item) => ({
          [collectionType]: {
            ...item,
            collectionType, // Add `collectionType` dynamically inside the collection object
          },
        }))
      );

      // Log combined feed before sorting
      // console.log('Combined feed before sorting:', combinedFeed);

      // Sort by publishedAt
      combinedFeed.sort((a, b) => {
        const dateA = Object.values(a)[0].publishedAt;
        const dateB = Object.values(b)[0].publishedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      // Pagination: Calculate totals across all collections
      const total = results.reduce((sum, { total }) => sum + total, 0);
      const paginatedFeed = combinedFeed.slice(0, pageSize);

      // Log final structured items
      // console.log('Paginated feed (final structure):', paginatedFeed);

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
      strapi.log.error('Error fetching GraphQL feed items:', error);
      throw new Error('Unable to fetch GraphQL feed items');
    }
  },
});

export default graphqlService;
