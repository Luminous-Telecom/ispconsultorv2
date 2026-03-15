module.exports = {
  style: {
    sass: {
      loaderOptions: {
        sassOptions: {
          silenceDeprecations: ['legacy-js-api', 'import'],
          quietDeps: true,
        },
      },
    },
  },
};
