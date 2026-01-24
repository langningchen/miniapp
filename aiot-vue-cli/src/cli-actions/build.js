#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const rimraf = require('rimraf');
const { Command } = require('commander');

const info = require('../libs/appinfo');
const share = require('../libs/share');

const build = require('../steps/build');
const qjscAll = require('../steps/qjsc');
const manifest = require('../steps/manifest');
const package = require('../steps/pack');
const colors = require('colors-console');
const uploadCliActivity = require('./utils/UploadInfo')


function deleteFolderRecursive(url) {
  var files = [];
  /**
   * 判断给定的路径是否存在
   */
  if (fs.existsSync(url)) {
      /**
       * 返回文件和子目录的数组
       */
      files = fs.readdirSync(url);
      files.forEach(function (file, index) {

          var curPath = path.join(url, file);
          /**
           * fs.statSync同步读取文件夹文件，如果是文件夹，在重复触发函数
           */
          if (fs.statSync(curPath).isDirectory()) { // recurse
              deleteFolderRecursive(curPath);
          } else {
              fs.unlinkSync(curPath);
          }
      });
      /**
       * 清除文件夹
       */
      fs.rmdirSync(url);
  }
}

function prepare() {
  // 上报build埋点
  uploadCliActivity('activity', 'build_project')

  // 先清理以前的构建内容
  const falconBuildDir = info.getFalconBuildDir()
  deleteFolderRecursive(falconBuildDir)
  fs.mkdirSync(falconBuildDir)

  const tmpFileDir = info.getBuildTempFileDir();
  deleteFolderRecursive(tmpFileDir)
  fs.mkdirSync(tmpFileDir)

  const DIST_FILE = info.getAmrPath()
  if (fs.existsSync(DIST_FILE)) {
    fs.unlinkSync(DIST_FILE);
  }
}

/*
 * 构建步骤
 * 1.build
 * 2.qjsc
 * 3.pack
 */

module.exports = async function (command) {
  const { compress, qjsc, pack, mock, env } = command;

  if (!info.isValidRoot()) {
    return -1
  }

  prepare();

  const packageInfo = info.getAppPackageInfo();
  if (!packageInfo.appid) {
    console.log(colors('red', `ERROR: 打包失败，找不到应用的appid，请在根目录下的package.json中配置，例如：
      {
        "name": "xxxxxx",
        "appid": "8000251822789980",
        ...
      }
      注：appid要求长度为16，以800开头
    `));
    deleteFolderRecursive(info.getFalconBuildDir())
    return
  }

  await build({
    minify: compress,
    mock,
    env,
  });
  if (qjsc) {
    await qjscAll(share.internalModules);
  }
  if (pack) {
    await manifest.generate();
    await package.pack();
  }
  return 0
}
