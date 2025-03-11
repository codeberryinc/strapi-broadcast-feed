/// <reference types="koa" />
declare const _default: {
    controller: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => {
        getFeed(ctx: import("koa").Context): Promise<void>;
    };
};
export default _default;
