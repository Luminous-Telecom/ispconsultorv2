const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // Garantir que resolve.alias existe e está configurado
      if (!webpackConfig.resolve) {
        webpackConfig.resolve = {};
      }
      if (!webpackConfig.resolve.alias) {
        webpackConfig.resolve.alias = {};
      }
      
      // Adicionar alias @ apontando para src
      webpackConfig.resolve.alias['@'] = path.resolve(__dirname, 'src');
      
      return webpackConfig;
    },
  },
};
