/**
 * 模拟器预览小程序
 */
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')

const info = require('../libs/appinfo');
const helper = require('../libs/helper');
const webPackConf = require('../webpreview').webpackConf;


async function dllBuilder(isBuild){
  if (!info.isValidRoot()) {
    return -1
  }
  const config = webPackConf.buildDll();
  return new Promise((resolve, reject) => {
    webpack(config(isBuild), (err, stats) => {
      const options = {
        preset: 'minimal',
        moduleTrace: true,
        errorDetails: true,
        colors: true
      }
      const statsString = stats.toString(options);
      if (err || (stats && stats.hasErrors())) {
        const info = stats.toJson();
        reject(err || info.errors);
      } else {
        resolve();
      }
    });
  });
}

module.exports.webPreview = async function () {
  if (!info.isValidRoot()) {
    return -1
  }
  await dllBuilder(false);
  const config = await webPackConf.dev();
  const port = await helper.findPort();

  const server = new WebpackDevServer(webpack(config), config.devServer);
  server.listen(port, '0.0.0.0', (err) => {
    if (err) {
      console.log(err);
    }
  });
}

module.exports.webBuild = async function () {
  if (!info.isValidRoot()) {
    return -1
  }
  await dllBuilder(true);
  const config = await webPackConf.buildWeb();
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      const options = {
        preset: 'minimal',
        moduleTrace: true,
        errorDetails: true,
        colors: true
      }
      const statsString = stats.toString(options);
      console.log(statsString);
      if (err || (stats && stats.hasErrors())) {
        reject();
      } else {
        resolve();
      }
    });
  }).catch((err) => {
    console.error(err)
  })
}
