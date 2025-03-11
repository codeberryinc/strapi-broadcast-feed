import type { Core } from '@strapi/strapi';
import getGraphQLFeedTypes from './graphql/types';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('✅ BroadcastFeed plugin registered!');

  const graphqlPlugin = strapi.plugin('graphql');

  if (!graphqlPlugin) {
    strapi.log.warn('⚠️ GraphQL plugin is not installed. Skipping GraphQL registration.');
    return;
  }

  const extensionService = graphqlPlugin.service('extension');

  const extension = ({ nexus }: any) => ({
    types: getGraphQLFeedTypes(strapi, nexus), // Register dynamic types
    plugins: [nexus.declarativeWrappingPlugin()], // Ensure required Nexus plugin
    resolversConfig: {
      'Query.broadcastFeed': {
        auth: false, // Allow public access
      },
    },
  });

  try {
    extensionService.use(extension);
    strapi.log.info('✅ GraphQL query registered successfully.');
  } catch (error) {
    strapi.log.error(`❌ Failed to register GraphQL query: ${error.message}`);
  }
};

export default register;
