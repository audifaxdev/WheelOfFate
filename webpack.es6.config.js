'use strict';
let path = require('path');
let webpack = require('webpack');

module.exports = {
  entry: {
    'app': ['./app/app.ts'],
    'vendor': ['three', 'lodash']
  },

  output: {
    path: './dist',
    filename: '[name].es6.bundle.js'
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader?configFileName=tsconfig.es2015.json'
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
    new webpack.ProvidePlugin({
      THREE: "three",
      _: "lodash",
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity,
      filename: '[name].bundle.js',
    }),
  ],
  devtool: false
};
