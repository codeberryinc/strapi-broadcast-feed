const bootstrap = ({ strapi }) => {
};
const destroy = ({ strapi }) => {
};
const getGraphQLFeedTypes = (strapi, nexus) => {
  const config2 = strapi.config.get("plugin::broadcast-feed");
  if (!config2 || !config2.feed?.collections?.length) {
    strapi.log.warn("⚠️ No collections configured for BroadcastFeed.");
    return [];
  }
  const collections = config2.feed.collections.map(({ uid }) => {
    const collectionName = uid.split("::")[1].split(".")[0];
    return { fieldName: collectionName, gqlType: capitalize(collectionName) };
  });
  return [
    // Pagination Metadata
    nexus.objectType({
      name: "GraphQLFeedPageInfo",
      definition(t) {
        t.int("total");
        t.int("page");
        t.int("pageSize");
        t.int("pageCount");
      }
    }),
    // Extend each collection type to include `collectionType`
    ...collections.map(
      ({ gqlType }) => nexus.extendType({
        type: gqlType,
        definition(t) {
          t.string("collectionType");
        }
      })
    ),
    // Unified Mixed Feed Item
    nexus.objectType({
      name: "GraphQLFeedItem",
      definition(t) {
        collections.forEach(({ fieldName, gqlType }) => {
          t.field(fieldName, {
            type: gqlType,
            resolve: (item) => {
              return item[fieldName] || null;
            }
          });
        });
      }
    }),
    // Define the response type for the query
    nexus.objectType({
      name: "GraphQLFeed",
      definition(t) {
        t.list.field("items", { type: "GraphQLFeedItem" });
        t.field("pageInfo", { type: "GraphQLFeedPageInfo" });
      }
    }),
    // Extend Query to include the broadcastFeed query
    nexus.extendType({
      type: "Query",
      definition(t) {
        t.field("broadcastFeed", {
          type: "GraphQLFeed",
          args: {
            filters: nexus.arg({ type: "JSON" }),
            page: nexus.intArg({ default: 1 }),
            pageSize: nexus.intArg({ default: 10 })
          },
          async resolve(_parent, args, context) {
            const { filters, page, pageSize } = args;
            const strapi2 = context.strapi || global.strapi;
            const graphqlService2 = strapi2.plugin("broadcast-feed").service("graphqlService");
            const { data, meta } = await graphqlService2.fetchGraphQLFeedItems(
              page,
              pageSize,
              filters
            );
            return {
              items: data,
              // Pass combined feed items from the service
              pageInfo: meta.pagination
            };
          }
        });
      }
    })
  ];
};
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const register = ({ strapi }) => {
  strapi.log.info("✅ BroadcastFeed plugin registered!");
  const graphqlPlugin = strapi.plugin("graphql");
  if (!graphqlPlugin) {
    strapi.log.warn("⚠️ GraphQL plugin is not installed. Skipping GraphQL registration.");
    return;
  }
  const extensionService = graphqlPlugin.service("extension");
  const extension = ({ nexus }) => ({
    types: getGraphQLFeedTypes(strapi, nexus),
    // Register dynamic types
    plugins: [nexus.declarativeWrappingPlugin()],
    // Ensure required Nexus plugin
    resolversConfig: {
      "Query.broadcastFeed": {
        auth: false
        // Allow public access
      }
    }
  });
  try {
    extensionService.use(extension);
    strapi.log.info("✅ GraphQL query registered successfully.");
  } catch (error) {
    strapi.log.error(`❌ Failed to register GraphQL query: ${error.message}`);
  }
};
const config = {
  default: {},
  validator() {
  }
};
const contentTypes = {};
const feedController = ({ strapi }) => ({
  async getFeed(ctx) {
    const { page = 1, pageSize = 10, fields, populate, filters } = ctx.query;
    try {
      const populateParams = populate ? parseAdvancedPopulate(populate) : void 0;
      console.log("Filters:", filters);
      const feedService = strapi.plugin("broadcast-feed").service("service");
      const feedResponse = await feedService.fetchFeedItems(
        parseInt(page, 10),
        parseInt(pageSize, 10),
        fields,
        populateParams,
        filters
        // Pass filters to the service
      );
      ctx.send(feedResponse);
    } catch (error) {
      strapi.log.error("Error in feed controller:", error);
      ctx.throw(500, "Failed to fetch feed data");
    }
  }
});
const parseAdvancedPopulate = (populate) => {
  if (typeof populate === "string") {
    return populate.split(",").reduce((acc, field) => {
      const keys = field.split("[").map((key) => key.replace("]", ""));
      let currentLevel = acc;
      keys.forEach((key, index2) => {
        if (!currentLevel[key]) {
          currentLevel[key] = index2 === keys.length - 1 ? true : {};
        }
        currentLevel = currentLevel[key];
      });
      return acc;
    }, {});
  }
  return populate;
};
const controllers = {
  controller: feedController
};
const middlewares = {};
const policies = {};
const searchRoutes = {
  "content-api": {
    type: "content-api",
    routes: [
      {
        method: "GET",
        path: "/feed",
        handler: "controller.getFeed",
        config: {
          policies: []
        }
      }
    ]
  }
};
const routes = {
  "content-api": searchRoutes["content-api"]
};
const service = ({ strapi }) => ({
  async fetchFeedItems(page = 1, pageSize = 10, fields, populate, filters) {
    const config2 = strapi.config.get("plugin::broadcast-feed");
    const { collections } = config2.feed;
    try {
      const combinedFilters = {
        ...filters,
        // User-defined filters
        publishedAt: { $notNull: true }
        // Enforce published filter
      };
      const results = await Promise.all(
        collections.map(
          ({ uid }) => strapi.db.query(uid).findMany({
            where: combinedFilters,
            // Apply filters here
            orderBy: { publishedAt: "desc" },
            populate
            // Pass parsed populate structure
          })
        )
      );
      const combinedFeed = results.flatMap(
        (items, index2) => items.map((item) => ({
          ...item,
          documentId: item.documentId,
          // Use documentId here
          collectionType: collections[index2].uid.split("::")[1].split(".")[0]
        }))
      );
      combinedFeed.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      const formattedFeed = await Promise.all(
        combinedFeed.map(async (entry) => {
          const response = { documentId: entry.documentId };
          if (fields) {
            const selectedFields = fields.split(",");
            selectedFields.forEach((field) => {
              if (entry[field] !== void 0) {
                response[field] = entry[field];
              }
            });
          } else {
            Object.keys(entry).forEach((field) => {
              response[field] = entry[field];
            });
          }
          if (populate) {
            const fullEntry = await strapi.db.query(`api::${entry.collectionType}.${entry.collectionType}`).findOne({
              where: { documentId: entry.documentId },
              // Use documentId in query
              populate
            });
            Object.assign(response, extractNestedFields(fullEntry, populate));
          }
          return response;
        })
      );
      const total = formattedFeed.length;
      const paginatedFeed = formattedFeed.slice((page - 1) * pageSize, page * pageSize);
      return {
        data: paginatedFeed,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total
          }
        }
      };
    } catch (error) {
      strapi.log.error("Error fetching feed items:", error);
      throw new Error("Unable to fetch feed items");
    }
  }
});
const extractNestedFields = (entry, populateParams) => {
  const result = {};
  Object.keys(populateParams).forEach((field) => {
    if (field === "populate") {
      Object.assign(result, extractNestedFields(entry, populateParams[field]));
      return;
    }
    if (entry && entry[field] !== void 0) {
      const nestedParams = populateParams[field];
      if (typeof nestedParams === "object" && Object.keys(nestedParams).length > 0) {
        result[field] = extractNestedFields(entry[field], nestedParams);
      } else {
        result[field] = entry[field];
      }
    }
  });
  return result;
};
const graphqlService = ({ strapi }) => ({
  async fetchGraphQLFeedItems(page = 1, pageSize = 10, filters) {
    const config2 = strapi.config.get("plugin::broadcast-feed");
    const { collections } = config2.feed;
    try {
      const combinedFilters = {
        ...filters,
        publishedAt: { $notNull: true }
        // Include only published items
      };
      const results = await Promise.all(
        collections.map(async ({ uid }) => {
          const items = await strapi.db.query(uid).findMany({
            where: combinedFilters,
            orderBy: { publishedAt: "desc" },
            limit: pageSize,
            offset: (page - 1) * pageSize,
            populate: true
            // Automatically include relations
          });
          const total2 = await strapi.db.query(uid).count({ where: combinedFilters });
          return { items, total: total2, collectionType: uid.split("::")[1].split(".")[0] };
        })
      );
      const combinedFeed = results.flatMap(
        ({ items, collectionType }) => items.map((item) => ({
          [collectionType]: {
            ...item,
            collectionType
            // Add `collectionType` dynamically inside the collection object
          }
        }))
      );
      combinedFeed.sort((a, b) => {
        const dateA = Object.values(a)[0].publishedAt;
        const dateB = Object.values(b)[0].publishedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      const total = results.reduce((sum, { total: total2 }) => sum + total2, 0);
      const paginatedFeed = combinedFeed.slice(0, pageSize);
      return {
        data: paginatedFeed,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total
          }
        }
      };
    } catch (error) {
      strapi.log.error("Error fetching GraphQL feed items:", error);
      throw new Error("Unable to fetch GraphQL feed items");
    }
  }
});
const services = {
  service,
  graphqlService
};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares
};
export {
  index as default
};
