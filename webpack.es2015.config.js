'use strict';
let path = require('path');
let webpack = require('webpack');

module.exports = {
  entry: {
    'app.es2015': ['./app/app.ts'],
    'vendor': ['three', 'lodash']
  },

  output: {
    path: './dist',
    filename: '[name].bundle.js'
  },

  module: {
    loaders: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        query: {
          configFileName: 'tsconfig.es2015.json'
        }
      }
    ]
  },

  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'app')
    ],
    extensions: ['.ts', '.js']
  },

  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity,
      filename: '[name].bundle.js',
    }),
  ],
  devtool: false
};
