const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  entry: "./src/renderer/index.tsx",
  target: "web", // Mudamos de electron-renderer para web para forçar bundle browser
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  externals: {
    // Não empacotar módulos Node.js - não estão disponíveis no renderer
    electron: "commonjs electron",
    fs: "commonjs fs",
    path: "commonjs path",
    crypto: "commonjs crypto",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      // Desabilitar completamente polyfills Node.js
      path: false,
      fs: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      url: false,
      buffer: false,
      util: false,
      assert: false,
      os: false,
      events: false,
      process: false,
      net: false,
      tls: false,
      child_process: false,
    },
  },
  output: {
    filename: "renderer.js",
    path: path.resolve(__dirname, "dist/renderer"),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/renderer/index.html",
    }),
    // Define variáveis globais para compatibilidade
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV || "development"
      ),
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
  ],
  devServer: {
    port: 3000,
    hot: true,
  },
};
