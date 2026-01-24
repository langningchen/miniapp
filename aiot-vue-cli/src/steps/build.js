/**
 * 构建主工程
 */
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra')

const rollup = require('rollup');

const getConfig = require('../libs/rollup.config');
const {getConfigService, getConfigProvider} = require('../libs/rollup.config.service.js');
const log = require('../libs/log');
const share = require('../libs/share');
const appInfo = require('../libs/appinfo');
const helper = require('../libs/helper');

module.exports = async function (opt) {
  const options = await getConfig(opt);
  const appBundle = await rollup.rollup(options.input);
  await appBundle.write(options.output);

  appendKeyFrameCode();

  // NOTE: services and providers will generated in appBundle progress
  //const meta = appInfo.getAppMeta();
  //if (meta.services && Object.keys(meta.services).length > 0) {
  //  const optionsService = await getConfigService(opt);
  //  const appBundleService = await rollup.rollup(optionsService.input);
  //  await appBundleService.write(optionsService.output);
  //}
  //if (meta.providers && Object.keys(meta.providers).length > 0) {
  //  const optionsProvider = await getConfigProvider(opt);
  //  const appBundleProvider = await rollup.rollup(optionsProvider.input);
  //  await appBundleProvider.write(optionsProvider.output);
  //}

  syncDirs();
  log.success('应用构建成功,目录:', options.output.dir);
}

function appendKeyFrameCode() {
  if (share.keyframes.length === 0) {
    return;
  }
  //构建结束以后把keyframes信息写进App中
  const appFile = path.resolve(appInfo.getFalconBuildDir(), appInfo.APP_ENTRY_FILE_NAME);
  if (!fs.existsSync(appFile)) {
    console.error(`文件不存在:${appFile}`);
    return;
  }
  const appCode = helper.getContent(appFile);
  const keyFrameCode = `$falcon.__KEYFRAMES = ${JSON.stringify(share.keyframes)};\n`
  fs.writeFileSync(appFile, appCode + keyFrameCode);
}

function copyDir(dirName)
{
  const dirSrc = path.resolve(appInfo.getAppRoot(), dirName)
  const dirTgt = path.resolve(appInfo.getFalconBuildDir(), dirName)
  if (fs.existsSync(dirSrc)) {
    try {
      fse.copySync(dirSrc, dirTgt)
      log.success(`${dirName} 同步成功: ${dirTgt}`)
    } catch (err) {
      log.error(`${dirName} 同步失败: ${dirSrc} -> ${dirTgt}`)
      throw err
    }
  }
}

function syncDirs() {
  copyDir('libs')
  copyDir('jsworkers')
  copyDir('assets')
}
