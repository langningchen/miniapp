/**
 * 使用qjsc库将js转成bin
 */
const fs = require('fs');
const path = require('path');

const qjsCompile = (require('../../cli-libs/index.js')['aiot-qjsc-tool/libs/qjsc']).compileJs

const appInfo = require('../libs/appinfo');
const helper = require('../libs/helper.js')


async function compileAll(internalModules) {
  const falconBuildDir = appInfo.getFalconBuildDir();
  const qjsOptions = appInfo.getAppPackageInfo().quickjs || {};
  const qjs_ver = qjsOptions.version || '20200705'; //默认的quickjs版本
  const bigNum = qjsOptions.bigNum || false;  //默认关闭bugNum

  const files = await helper.walk(falconBuildDir)
  const inputJsFiles = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (path.extname(file) == '.js') {
      // console.log('compile file:', file);
      const inputFile = file
      const outputFile = inputFile + '.bin';

      let success = await qjsCompile(inputFile, outputFile, {
        version: qjs_ver,
        bigNum: bigNum,
        module: true,
        internal: internalModules
      });
      if (success) {
        inputJsFiles.push(inputFile);
      } else {
        throw Error('qjsc compile fail! input:' +  inputFile);
      }
    }
  }
  inputJsFiles.forEach((file) => {
    fs.unlinkSync(file);
  });
}

module.exports = compileAll;

