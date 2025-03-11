import type { Core } from '@strapi/strapi';
declare const service: ({ strapi }: {
    strapi: Core.Strapi;
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
export default service;
