const path = require('path')

module.exports = {
  projectName: 'video-parser',
  date: '2026-5-4',
  designWidth: 375,
  deviceRatio: {
    375: 2 / 1,
    640: 2 / 1,
    750: 1,
    828: 1,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [
    '@tarojs/plugin-platform-weapp',
    '@tarojs/plugin-platform-h5',
    '@tarojs/plugin-platform-tt',
    '@tarojs/plugin-platform-qq',
  ],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          selectorBlackList: ['body'],
        },
      },
      url: {
        enable: true,
        config: {
          limit: 1024,
        },
      },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    outputPath: 'build/h5',
    template: 'src/app.html',
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          selectorBlackList: ['body'],
        },
      },
      url: {
        enable: true,
        config: {
          limit: 1024,
        },
      },
    },
  },
  // 开发服务器配置
  devServer: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://47.114.121.129',
        changeOrigin: true,
      },
    },
  },
}
