import type { Core } from '@strapi/strapi';
declare const graphqlService: ({ strapi }: {
    strapi: Core.Strapi;
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
export default graphqlService;
