const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const distDir = path.resolve(__dirname, 'dist');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: './src/index.ts',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: [
    function ({ request }, callback) {
      if (request === 'api' || request === 'api/types') {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  ],
  output: {
    filename: 'index.js',
    path: distDir,
    libraryTarget: 'commonjs',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: '.' },
        { from: 'src/webview.js', to: 'webview.js' },
      ],
    }),
  ],
  stats: {
    errorDetails: true,
  },
};