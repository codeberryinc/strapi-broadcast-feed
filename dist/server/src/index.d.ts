/// <reference types="koa" />
declare const _default: {
    register: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    destroy: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    config: {
        default: {};
        validator(): void;
    };
    controllers: {
        controller: ({ strapi }: {
            strapi: import("@strapi/types/dist/core").Strapi;
        }) => {
            getFeed(ctx: import("koa").Context): Promise<void>;
        };
    };
    routes: {
        'content-api': {
            type: string;
            routes: {
                method: string;
                path: string;
                handler: string;
                config: {
                    policies: any[];
                };
            }[];
        };
    };
    services: {
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
    contentTypes: {};
    policies: {};
    middlewares: {};
};
export default _default;
