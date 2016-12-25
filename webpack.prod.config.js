'use strict';
let webpack = require('webpack');
let path = require('path');

module.exports = {
  entry: {
    'app': ['./app/app.ts'],
    'vendor': ['three', 'lodash']
  },

  output: {
    path: './dist',
    filename: '[name].es5.prod.bundle.js'
  },

  module: {
    rules: [
      { test: /\.ts$/, use: 'ts-loader' }
    ]
  },

  plugins: [
    new webpack.ProvidePlugin({
      THREE: "THREE",
      _: "lodash",
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: true
      },
      output: {
        comments: false
      },
      sourceMap: false
    })
  ],

  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'app')
    ],
    extensions: ['.ts', '.js']
  },

  devtool: false
};