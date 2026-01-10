const path = require('path');

// Interceptar TODAS as saídas, incluindo process.stdout.write
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);
const originalLog = console.log;
const originalInfo = console.info;

const shouldBlock = (chunk) => {
  const str = chunk.toString();
  return str.includes('http://localhost:3000') || 
         str.includes('On Your Network') ||
         str.includes('You can now view') ||
         str.includes('Local:') ||
         (str.includes('Compiled successfully!') && str.includes('localhost'));
};

process.stdout.write = function(chunk, encoding, callback) {
  if (shouldBlock(chunk)) {
    return true; // Suprimir a mensagem
  }
  return originalStdoutWrite(chunk, encoding, callback);
};

process.stderr.write = function(chunk, encoding, callback) {
  if (shouldBlock(chunk)) {
    return true; // Suprimir a mensagem
  }
  return originalStderrWrite(chunk, encoding, callback);
};

console.log = (...args) => {
  const message = args.join(' ');
  if (shouldBlock(message)) {
    return; // Não mostrar
  }
  originalLog(...args);
};

console.info = (...args) => {
  const message = args.join(' ');
  if (shouldBlock(message)) {
    return; // Não mostrar
  }
  originalInfo(...args);
};

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    plugins: [
      // Plugin para interceptar mensagens do webpack
      {
        apply: (compiler) => {
          compiler.hooks.done.tap('SuppressURLs', (stats) => {
            // Não fazer nada - apenas suprimir a mensagem padrão
          });
        },
      },
    ],
    configure: (webpackConfig) => {
      // Encontrar e modificar a regra do sass-loader
      const sassRule = webpackConfig.module.rules.find(
        rule => rule.oneOf && rule.oneOf.some(
          loader => typeof loader.test === 'object' &&
                   loader.test.toString().includes('scss')
        )
      );

      if (sassRule) {
        sassRule.oneOf.forEach(loader => {
          if (loader.use && loader.use.some(u => u.loader && u.loader.includes('sass-loader'))) {
            loader.use.forEach(use => {
              if (use.loader && use.loader.includes('sass-loader')) {
                use.options = {
                  ...use.options,
                  implementation: require('sass'),
                  sassOptions: {
                    ...use.options?.sassOptions,
                    fiber: false,
                  },
                };
              }
            });
          }
        });
      }

      return webpackConfig;
    },
  },
  devServer: {
    open: false,
    client: {
      overlay: true,
      progress: false,
      logging: 'none',
    },
    onAfterSetupMiddleware: () => {
      // Não fazer nada
    },
    onListening: () => {
      // Suprimir mensagem de listening
    },
  },
};
