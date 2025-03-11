import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';

const feedController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getFeed(ctx: Context) {
    const { page = 1, pageSize = 10, fields, populate, filters } = ctx.query;

    try {
      // Parse advanced population dynamically
      const populateParams = populate ? parseAdvancedPopulate(populate) : undefined;

      // Log filters for debugging
      console.log('Filters:', filters);

      // Call the service to fetch feed items
      const feedService = strapi.plugin('broadcast-feed').service('service');
      const feedResponse = await feedService.fetchFeedItems(
        parseInt(page as string, 10),
        parseInt(pageSize as string, 10),
        fields as string,
        populateParams,
        filters as any // Pass filters to the service
      );

      // Send the response
      ctx.send(feedResponse);
    } catch (error) {
      strapi.log.error('Error in feed controller:', error);
      ctx.throw(500, 'Failed to fetch feed data');
    }
  },
});

// Helper to parse complex nested population parameters
const parseAdvancedPopulate = (populate: any): Record<string, any> => {
  if (typeof populate === 'string') {
    return populate.split(',').reduce((acc: Record<string, any>, field: string) => {
      const keys = field.split('[').map((key) => key.replace(']', ''));
      let currentLevel = acc;
      keys.forEach((key, index) => {
        if (!currentLevel[key]) {
          currentLevel[key] = index === keys.length - 1 ? true : {}; // Replace "url" with `true`
        }
        currentLevel = currentLevel[key];
      });
      return acc;
    }, {});
  }

  return populate; // Pass through if already an object
};

export default feedController;
