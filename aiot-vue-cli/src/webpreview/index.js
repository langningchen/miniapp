/**
 * 导出webPreview配置
 */

module.exports = {
  webpackConf: {
    dev:() => require('./configs/webpack.dev.conf'),
    buildWeb:() => require('./configs/webpack.build.web.conf'),
    buildDll:() => require('./configs/webpack.dll.config')
  }
};