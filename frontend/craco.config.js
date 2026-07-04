const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const ForkTsCheckerWebpackPlugin = require('react-dev-utils/ForkTsCheckerWebpackPlugin');
const ForkTsCheckerWarningWebpackPlugin = require('react-dev-utils/ForkTsCheckerWarningWebpackPlugin');

function stripResolveUrlLoader(rules) {
  if (!rules) return;
  for (const rule of rules) {
    if (rule.oneOf) {
      stripResolveUrlLoader(rule.oneOf);
      continue;
    }
    if (!rule.use) continue;
    const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
    rule.use = uses.filter((entry) => {
      const loader = typeof entry === 'string' ? entry : entry.loader;
      return !loader || !String(loader).includes('resolve-url-loader');
    });
  }
}

module.exports = {
  devServer: (devServerConfig) => {
    const { onBeforeSetupMiddleware, onAfterSetupMiddleware, https, ...rest } = devServerConfig;

    const config = { ...rest };

    if (https === true) {
      config.server = 'https';
    } else if (https && typeof https === 'object') {
      config.server = { type: 'https', options: https };
    }

    config.setupMiddlewares = (middlewares, devServer) => {
      if (onBeforeSetupMiddleware) {
        onBeforeSetupMiddleware(devServer);
      }
      if (onAfterSetupMiddleware) {
        onAfterSetupMiddleware(devServer);
      }
      return middlewares;
    };

    return config;
  },
  webpack: {
    alias: {
      '@xterm/xterm$': require.resolve('@xterm/xterm/lib/xterm.js'),
      '@xterm/addon-fit$': require.resolve('@xterm/addon-fit/lib/addon-fit.js'),
      '@xterm/addon-web-links$': require.resolve('@xterm/addon-web-links/lib/addon-web-links.js'),
    },
    configure: (webpackConfig, { env }) => {
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        (plugin) => !(plugin instanceof ModuleScopePlugin)
      );

      // SCSS usa só data: URLs — resolve-url-loader exige source-map e quebra com GENERATE_SOURCEMAP=false
      stripResolveUrlLoader(webpackConfig.module.rules);

      if (env === 'development') {
        const ESLintWebpackPlugin = require('eslint-webpack-plugin');
        // Typecheck fica no IDE; ForkTsChecker recompila ~850 arquivos .ts/.tsx em paralelo
        webpackConfig.plugins = webpackConfig.plugins.filter(
          (plugin) =>
            !(plugin instanceof ForkTsCheckerWebpackPlugin) &&
            !(plugin instanceof ForkTsCheckerWarningWebpackPlugin) &&
            !(plugin instanceof ESLintWebpackPlugin)
        );

        webpackConfig.output.pathinfo = false;
        webpackConfig.devtool = 'eval-cheap-module-source-map';
      }

      return webpackConfig;
    },
  },
  style: {
    sass: {
      loaderOptions: {
        sourceMap: false,
        sassOptions: {
          silenceDeprecations: ['legacy-js-api', 'import'],
          quietDeps: true,
        },
      },
    },
  },
};
