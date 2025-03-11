import { Core } from '@strapi/strapi';

const getGraphQLFeedTypes = (strapi: Core.Strapi, nexus: any) => {
  const config = strapi.config.get('plugin::broadcast-feed') as
    | { feed: { collections: { uid: string }[] } }
    | undefined;

  if (!config || !config.feed?.collections?.length) {
    strapi.log.warn('⚠️ No collections configured for BroadcastFeed.');
    return [];
  }

  // Dynamically create types for each collection
  const collections = config.feed.collections.map(({ uid }) => {
    const collectionName = uid.split('::')[1].split('.')[0];
    return { fieldName: collectionName, gqlType: capitalize(collectionName) };
  });

  return [
    // Pagination Metadata
    nexus.objectType({
      name: 'GraphQLFeedPageInfo',
      definition(t) {
        t.int('total');
        t.int('page');
        t.int('pageSize');
        t.int('pageCount');
      },
    }),

    // Extend each collection type to include `collectionType`
    ...collections.map(({ gqlType }) =>
      nexus.extendType({
        type: gqlType,
        definition(t) {
          t.string('collectionType'); // Add `collectionType` to the collection fields
        },
      })
    ),

    // Unified Mixed Feed Item
    nexus.objectType({
      name: 'GraphQLFeedItem',
      definition(t) {
        // Dynamically add fields for each collection
        collections.forEach(({ fieldName, gqlType }) => {
          t.field(fieldName, {
            type: gqlType,
            resolve: (item) => {
              // Dynamically return only the field matching the collection type
              return item[fieldName] || null;
            },
          });
        });
      },
    }),

    // Define the response type for the query
    nexus.objectType({
      name: 'GraphQLFeed',
      definition(t) {
        t.list.field('items', { type: 'GraphQLFeedItem' });
        t.field('pageInfo', { type: 'GraphQLFeedPageInfo' });
      },
    }),

    // Extend Query to include the broadcastFeed query
    nexus.extendType({
      type: 'Query',
      definition(t) {
        t.field('broadcastFeed', {
          type: 'GraphQLFeed',
          args: {
            filters: nexus.arg({ type: 'JSON' }),
            page: nexus.intArg({ default: 1 }),
            pageSize: nexus.intArg({ default: 10 }),
          },
          async resolve(_parent, args, context) {
            const { filters, page, pageSize } = args;
            const strapi = context.strapi || global.strapi;

            const graphqlService = strapi.plugin('broadcast-feed').service('graphqlService');
            const { data, meta } = await graphqlService.fetchGraphQLFeedItems(
              page,
              pageSize,
              filters
            );

            // console.log('THE DATA IS:', data);

            return {
              items: data, // Pass combined feed items from the service
              pageInfo: meta.pagination,
            };
          },
        });
      },
    }),
  ];
};

// Helper to capitalize strings
const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

export default getGraphQLFeedTypes;
