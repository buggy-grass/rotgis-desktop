const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Webpack serve için sadece renderer config'i export et
if (process.env.WEBPACK_SERVE) {
  const rendererConfig = {
    mode: process.env.NODE_ENV || 'development',
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    devtool: 'source-map',
    devServer: {
      liveReload: true,
      hot: false,
      static: {
        directory: path.resolve(__dirname, 'dist'),
        publicPath: '/',
      },
      port: 8080,
      historyApiFallback: true,
      compress: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          include: /src/,
          use: [{ loader: 'ts-loader' }]
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
      publicPath: 'http://localhost:8080/',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    // Webpack-dev-server için externals kaldırıldı (nodeIntegration: true olduğu için)
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html'
      })
    ]
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
    mode: process.env.NODE_ENV || 'development',
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    devtool: 'source-map',
    devServer: {
      liveReload: true,
      hot: false,
      static: {
        directory: path.resolve(__dirname, 'dist'),
        publicPath: '/',
      },
      port: 8080,
      historyApiFallback: true,
      compress: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          include: /src/,
          use: [{ loader: 'ts-loader' }]
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
      publicPath: process.env.NODE_ENV === 'development' ? 'http://localhost:8080/' : './',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
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
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html'
      })
    ]
  }
  ];
}

