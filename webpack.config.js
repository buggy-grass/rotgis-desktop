const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Production optimizasyonları için helper
const isProduction = process.env.NODE_ENV === 'production';

// Webpack serve için sadece renderer config'i export et
if (process.env.WEBPACK_SERVE) {
  const rendererConfig = {
    mode: 'development',
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    // Development için hızlı source map
    devtool: 'eval-cheap-module-source-map',
    devServer: {
      liveReload: true,
      hot: false,
      static: {
        directory: path.resolve(__dirname, 'dist'),
        publicPath: '/',
      },
      port: 8080,
      historyApiFallback: true,
      compress: false, // Development'ta compression yapma (hızlı build)
      client: {
        overlay: {
          errors: false,
          warnings: false,
        },
      },
    },
    // Hataları görmezden gel, sadece uyar
    ignoreWarnings: [
      /Failed to parse source map/,
      /Module not found/,
    ],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          include: /src/,
          use: [{ 
            loader: 'ts-loader',
            options: {
              transpileOnly: true, // Type checking'i atla, sadece transpile et
              compilerOptions: {
                noUnusedLocals: false,
                noUnusedParameters: false,
              }
            }
          }]
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\.json$/,
          type: 'json'
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
      publicPath: 'http://localhost:8080/',
      // Development'ta code splitting yok, tek dosya
      clean: false, // Development'ta temizleme yapma (hızlı build)
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      // Module resolution optimizasyonları
      symlinks: false,
      cacheWithContext: false,
    },
    // Webpack-dev-server için externals kaldırıldı (nodeIntegration: true olduğu için)
    // Development'ta optimizasyonları kapat (hızlı build için)
    optimization: {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false, // Code splitting'i kapat - tek dosya (hızlı build)
      minimize: false,
      usedExports: false, // Tree shaking'i kapat
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
        minify: false, // Development'ta minify etme
      })
    ],
    // Cache optimizasyonları - development için hızlı cache
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
      cacheDirectory: path.resolve(__dirname, '.webpack-cache-dev'),
      compression: 'gzip', // Cache'i sıkıştır
    },
  };
  
  module.exports = rendererConfig;
} else {
  module.exports = [
  // Main process (Electron)
  {
    mode: process.env.NODE_ENV || 'development',
    entry: './src/main/main.ts',
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: 'ts-loader' }]
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    node: {
      __dirname: false,
      __filename: false
    }
  },
  // Preload script
  {
    mode: process.env.NODE_ENV || 'development',
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: 'ts-loader' }]
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'preload.js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    node: {
      __dirname: false,
      __filename: false
    }
  },
  // Renderer process (React)
  {
    mode: 'development',
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    // Development için hızlı source map
    devtool: 'eval-cheap-module-source-map',
    devServer: {
      liveReload: true,
      hot: false,
      static: {
        directory: path.resolve(__dirname, 'dist'),
        publicPath: '/',
      },
      port: 8080,
      historyApiFallback: true,
      compress: false, // Development'ta compression yapma (hızlı build)
      client: {
        overlay: {
          errors: false,
          warnings: false,
        },
      },
    },
    // Hataları görmezden gel, sadece uyar
    ignoreWarnings: [
      /Failed to parse source map/,
      /Module not found/,
    ],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          include: /src/,
          use: [{ 
            loader: 'ts-loader',
            options: {
              transpileOnly: true, // Type checking'i atla, sadece transpile et
              compilerOptions: {
                noUnusedLocals: false,
                noUnusedParameters: false,
              }
            }
          }]
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\.json$/,
          type: 'json'
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
      publicPath: './',
      // Development'ta code splitting yok
      clean: false, // Development'ta temizleme yapma
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      // Module resolution optimizasyonları
      symlinks: false,
      cacheWithContext: false,
      // Alias optimizasyonları (Potree için)
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    externals: {
      'events': 'commonjs events',
      'fs': 'commonjs fs',
      'path': 'commonjs path',
      'crypto': 'commonjs crypto',
      'stream': 'commonjs stream',
      'util': 'commonjs util',
      'buffer': 'commonjs buffer',
      'process': 'commonjs process',
      'os': 'commonjs os',
      'url': 'commonjs url',
      'querystring': 'commonjs querystring',
      'http': 'commonjs http',
      'https': 'commonjs https',
      'net': 'commonjs net',
      'tls': 'commonjs tls',
      'zlib': 'commonjs zlib',
      'assert': 'commonjs assert',
      'constants': 'commonjs constants',
    },
    // Development optimizasyonları - hızlı build için minimal
    optimization: {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false, // Code splitting'i kapat - tek dosya (hızlı build)
      minimize: false,
      usedExports: false, // Tree shaking'i kapat
      // Production'da kullanılacak optimizasyonlar (şimdilik kapalı)
      // ... (production build'de bu optimizasyonlar aktif olacak)
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        } : false,
      })
    ],
    // Cache optimizasyonları - development için hızlı cache
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
      cacheDirectory: path.resolve(__dirname, '.webpack-cache-dev'),
      compression: 'gzip', // Cache'i sıkıştır
    },
    // Performance hints
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 5120000, // 5MB - Potree için yüksek limit
      maxAssetSize: 5120000,
    },
  }
  ];
}

