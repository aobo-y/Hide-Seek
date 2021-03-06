const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    background: './src/background.js',
    content: './src/content.js',
    firstchart: './src/firstchart.js',
    options: './src/options.js',
    popup: './src/popup.js',
    springy: './src/springy-viz.js'
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },

  devtool: 'cheap-module-eval-source-map',

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }
    ]
  }
};
