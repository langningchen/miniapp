const path = require('path')
const webpack = require('webpack')
const appInfo = require('../../libs/appinfo');
const AssetsPlugin = require('assets-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const webPaths = require('../../../web-libs/web-index.js')

// '@vue/',
// '@falcon-vue-render/',
// '@falcon-vue-loader/',
// '@falcon-style-loader/',
// '@timers-browserify',
// '@css-loader/',
// '@setimmediate/',
// '@process/',
// "@webpack"

// 待打包进dll的文件
// const vendor = ['vue', 'falcon-vue-render', require.resolve('phantom-limb')];
const vendor = [
  webPaths['vue'],
  webPaths['falcon-vue-render'],
  require.resolve('phantom-limb')
];

module.exports = function (isBuild) {
  const distDir = isBuild ? 'dist' : '.temp';
  const config =  {
    entry: {
      vendor
    },
    output: {
      filename: '_dll_vendor.js',
      path: path.resolve(appInfo.getAppRoot(), distDir),
      library: '_dll_vendor',
      libraryTarget: 'var'
    },
    plugins: [
      // 让 DLLReferencePlugin 映射到相关的依赖上去的
      new webpack.DllPlugin({
        name: '_dll_vendor',
        path: path.resolve(appInfo.getAppRoot(), distDir, '_dll_manifest.json')
      }),
      new AssetsPlugin({
        filename: 'webpack-assets.json',
        path: path.resolve(appInfo.getAppRoot(), distDir)
      })
    ]
  };
  if(isBuild){
    config.plugins.push(new UglifyJsPlugin());
  }
  return config;
}