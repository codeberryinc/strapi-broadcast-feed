import type { Context } from 'koa';
import type { Core } from '@strapi/strapi';
declare const feedController: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getFeed(ctx: Context): Promise<void>;
};
export default feedController;
