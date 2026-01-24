/**
 * 生成manifest.json
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const colors = require('colors-console');

const appInfo = require('../libs/appinfo');
const helper = require('../libs/helper.js')

/**
 * 根据package.json生成manifest.json
 */
async function generateManifest() {
  const DIST_DIR = appInfo.getFalconBuildDir();
  const appPkg = appInfo.getAppPackageInfo();
  const appJson = appInfo.getAppJsonInfo();

  let files = await helper.walk(DIST_DIR)
  let filesInfo = {
    appName: appPkg.appName ? appPkg.appName : appPkg.name,
    version: appPkg.version,
  };

  if (appPkg.appid) {
    filesInfo.appid = appPkg.appid;
  } else {
    console.log(colors('red', 'ERROR: 未在package.json中配置应用的appid'));
  }

  // 拷贝icon到打包结果根目录
  if (appPkg.icon) {
    const iconFilePath = appInfo.pathResolve(appPkg.icon);
    const distIconPath = path.resolve(DIST_DIR, path.basename(appPkg.icon));
    if (fs.existsSync(iconFilePath)) {
      fs.copyFileSync(iconFilePath, distIconPath);
    }
    filesInfo.icon = path.basename(appPkg.icon);
  } else {
    console.log(colors('yellow', 'WARNING: 未在package.json:中配置应用icon路径'));
  }

  if (appPkg.quickjs) {
    filesInfo.quickjs = appPkg.quickjs;
  }

  if (appJson.meta) {
    filesInfo.meta = appJson.meta;
  }

  if (appJson.props) {
    filesInfo.props = appJson.props;
  }

  filesInfo.cert = {};
  files.forEach((filePath) => {
    let fileStat = fs.statSync(filePath);
    let relPath = path.relative(DIST_DIR, filePath)
    relPath = relPath.replace(/\\/g, '/')
    filesInfo.cert[relPath] = {
      size: fileStat.size,
      md5: getFileMd5(filePath),
    }
  });

  fs.writeFileSync(path.resolve(DIST_DIR, 'manifest.json'), JSON.stringify(filesInfo, null, 2));
}

function getFileMd5(filePath) {
  let buffer = fs.readFileSync(filePath);
  let fsHash = crypto.createHash('md5');
  fsHash.update(buffer);
  let md5 = fsHash.digest('hex');
  return md5;
}

exports.generate = generateManifest;
