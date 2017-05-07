'use strict';
const BabiliPlugin = require("babili-webpack-plugin");
const path = require('path');
const webpack = require('webpack');

module.exports = {
  context: path.resolve(__dirname, './src'),
  entry: {
    client: path.resolve(__dirname, './src/app.ts'),
    vendor: ['three', 'cannon', 'lodash', 'gsap', 'dat-gui'],
  },

  output: {
    path: path.resolve(__dirname, './dist/'),
    publicPath: path.resolve(__dirname, './dist/'),
    filename: '[name].bundle.js'
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader?configFileName=tsconfig.json'
      },
// Font Definitions
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        loader: 'url-loader'
      }
    ]
  },

  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, './src')
    ],
    extensions: ['.ts', '.tsx', '.js', '.scss']
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }),

// new BabiliPlugin(),

    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity,
      filename: '[name].bundle.js',
    }),

  ],
  devServer: {
    contentBase: path.join(__dirname, "./"),
    compress: true,
    hot: true,
    port: 9000
  },
};
