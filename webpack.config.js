// webpack.config.js
import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('webpack').Configuration} */
export default {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/[name].[contenthash].js',
    assetModuleFilename: 'assets/[name].[contenthash][ext][query]',
    publicPath: '/',          // 保持和旧项目一致
    clean: true               // 等价于 CleanWebpackPlugin，简单场景直接用它
  },
  target: 'web',
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-cheap-module-source-map',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      three: path.resolve(__dirname, "node_modules/three")
    },
    extensions: ['.js', '.json']
  },
  module: {
    rules: [
      // 你的源码走 babel
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      // CSS / Less
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.less$/i,
        use: ['style-loader', 'css-loader', 'less-loader']
      },
      // 图片（自动在 dataURL 与文件之间选择，阈值 8KB）
      {
        test: /\.(png|jpe?g|gif|webp|svg)$/i,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } }
      },
      // 字体/大文件：始终输出为文件
      {
        test: /\.(woff2?|eot|ttf|otf|glb|gltf|bin|obj|mtl)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
      inject: 'body'
    }),
    // 你也可以不用 CleanWebpackPlugin，因为 output.clean 已经生效
    new CleanWebpackPlugin(),
    // 若需要在全局使用 $/jQuery（兼容老代码）
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery'
    })
  ],
  devServer: {
    host: '127.0.0.1',
    port: 8091,
    static: {
      directory: path.resolve(__dirname, 'public')
    },
    historyApiFallback: true,
    compress: true,
    hot: true,
    proxy: {
      '/api': {
        target: 'http://114.116.22.79:8080/',
        changeOrigin: true,
        pathRewrite: { '^/api': '' }
      }
    }
  },
  performance: {
    hints: false
  }
};
