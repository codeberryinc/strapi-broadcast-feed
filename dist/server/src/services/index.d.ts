declare const _default: {
    service: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => {
        fetchFeedItems(page?: number, pageSize?: number, fields?: string, populate?: Record<string, any>, filters?: Record<string, any>): Promise<{
            data: Record<string, any>[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    pageCount: number;
                    total: number;
                };
            };
        }>;
    };
    graphqlService: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => {
        fetchGraphQLFeedItems(page?: number, pageSize?: number, filters?: Record<string, any>): Promise<{
            data: {
                [x: string]: any;
            }[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    pageCount: number;
                    total: number;
                };
            };
        }>;
    };
};
export default _default;
