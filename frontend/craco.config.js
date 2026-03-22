const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');

module.exports = {
  webpack: {
    alias: {
      // $ = match exato, para não interceptar subpaths como @xterm/xterm/css/xterm.css
      '@xterm/xterm$': require.resolve('@xterm/xterm/lib/xterm.js'),
      '@xterm/addon-fit$': require.resolve('@xterm/addon-fit/lib/addon-fit.js'),
      '@xterm/addon-web-links$': require.resolve('@xterm/addon-web-links/lib/addon-web-links.js'),
    },
    configure: (webpackConfig) => {
      // Remove o ModuleScopePlugin para permitir aliases apontando para node_modules via caminho absoluto
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        (plugin) => !(plugin instanceof ModuleScopePlugin)
      );
      return webpackConfig;
    },
  },
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
