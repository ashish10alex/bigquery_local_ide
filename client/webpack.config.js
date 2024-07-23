const PerspectivePlugin = require("@finos/perspective-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.js", // Point to your main JavaScript file
  plugins: [
    new PerspectivePlugin(),
    new HtmlWebpackPlugin({
      template: "./src/index.html", // Path to your HTML file
    }),
  ],
  resolve: {
    fallback: {},
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
