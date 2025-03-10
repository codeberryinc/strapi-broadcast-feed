export default [
  {
    method: 'GET',
    path: '/feed',
    // name of the controller file & the method.
    handler: 'controller.getFeed',
    config: {
      policies: [],
    },
  },
];
