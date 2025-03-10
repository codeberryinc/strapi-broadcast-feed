export default {
  'content-api': {
    type: 'content-api',
    routes: [
      {
        method: 'GET',
        path: '/feed',
        handler: 'controller.getFeed',
        config: {
          policies: [],
        },
      },
    ],
  },
};
