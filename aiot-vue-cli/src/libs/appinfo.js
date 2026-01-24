/**
 * 获取小程序配置信息
 */
const path = require('path');
const fs = require('fs');
const log = require('./log');

// falcon构建产物目录
const APP_BUILD_FALCON_DIR = '.falcon_';

// 构建过程中的临时产物目录
const BUILD_TEMP_FILE_DIR = '.falcon_tmp';

const isWin = /^win/.test(process.platform);

/**
 * 应用源码目录
 */
const APP_SOURCE_DIR = 'src';

/**
 * 应用配置信息
 */
const APP_JSON_FILE_NAME = 'app.json';

/**
 * 应用META信息文件名
 * 已废弃
 */
const APP_META_FILE_NAME = `app-meta.js`;

/**
 * meta临时文件.解决node import文件需要使用mjs后缀问题
 * 已废弃
 */
const APP_META_TEMP_FILE_NAME = `.app-meta.mjs`;

/**
 * 应用入口文件
 */
const APP_ENTRY_FILE_NAME = 'app.js'; //bootstrap.native.js

// 校验指定的应用目录是否合法
function validateAppRoot(appRoot, silent) {
  //判断是否有package.json,app.js(或者app-meta.mjs)
  if (appRoot == null) {
    return false;
  }

  const valid = fs.existsSync(path.resolve(appRoot, 'package.json'))
    && (fs.existsSync(path.resolve(appRoot, APP_SOURCE_DIR, 'app.js'))
      || fs.existsSync(path.resolve(appRoot, APP_SOURCE_DIR, 'app-meta.js')));


  if (!valid && !silent) {
    log.error(`"${path.resolve(appRoot)}"不是一个有效的应用目录!`);
  }
  return valid;
}

let _app_root = null;
let _app_meta = null;
let _isSingleJsbundle = -1; // -1未获取 1:为单个bundle 2:非单个bundle
let _app_pkg_info = null;
let _app_json_info = null;

const appInfo = {
  isWin,
  APP_ENTRY_FILE_NAME,
  /**
   * 初始化
   * @param {String} root 待构建工程根目录
   */
  async init(root) {
    if (root == null) {
      return false;
    }

    _app_root = path.resolve(root);
    let ret = validateAppRoot(_app_root);
    if (!ret) {
      return false
    }
    await this._initAppMeta()
    return true
  },

  isInited() {
    return _app_root !== null
  },
  
  isValidRoot() {
    return validateAppRoot(_app_root, true)
  },

  /**
   * 应用根目录
   */
  getAppRoot() {
    if (!_app_root) {
      throw new Error('app info uninit!');
    }
    return _app_root;
  },

  /**
   * 应用源码目录
   */
  getAppSourceDir() {
    return path.resolve(this.getAppRoot(), APP_SOURCE_DIR);
  },

  /**
   * 应用入口文件
   */
  getAppEntryFile() {
    return path.resolve(this.getAppSourceDir(), APP_ENTRY_FILE_NAME);
  },

  /**
   * falcon构建产物目录
   */
  getFalconBuildDir() {
    return path.resolve(this.getAppRoot(), APP_BUILD_FALCON_DIR);
  },

  getServiceBuildDir() {
    return path.resolve(this.getAppRoot(), APP_BUILD_FALCON_DIR, 'services');
  },

  getProviderBuildDir() {
    return path.resolve(this.getAppRoot(), APP_BUILD_FALCON_DIR, 'providers');
  },

  /**
   * 构建过程中的临时文件目录
   */
  getBuildTempFileDir() {
    return path.resolve(this.getAppRoot(), BUILD_TEMP_FILE_DIR)
  },

  /**
   * 获取应用packageInfo
   */
  getAppPackageInfo() {
    if (!_app_pkg_info) {
      const pkgPath = this.getAppPackagePath()
      _app_pkg_info = fs.existsSync(pkgPath) ? require(pkgPath) : {};
    }
    return _app_pkg_info;
  },

  /**
   * 获取应用appJson
   */
  getAppJsonInfo() {
    if (!_app_json_info) {
      const jsonPath = this.getAppJsonPath()
      _app_json_info = fs.existsSync(jsonPath) ? require(jsonPath) : {};
    }
    return _app_json_info;
  },

  getPreviewOptions() {
    const pkgInfo = this.getAppPackageInfo()
    return pkgInfo.previewOptions || {}
  },
  
  getAppPackagePath() {
    return path.resolve(this.getAppRoot(), 'package.json');
  },

  getAppJsonPath() {
    return path.resolve(path.resolve(this.getAppRoot(), 'src'), 'app.json');
  },

  getAppPackageData() {
    const pkgPath = this.getAppPackagePath()
    return fs.readFileSync(pkgPath, 'utf8')
  },

  getAppid() {
    const packageInfo = this.getAppPackageInfo();
    return packageInfo.appid
  },

  getAmrPath() {
    const packageInfo = this.getAppPackageInfo();
    const DIST_DIR = this.getAppRoot();
    const DIST_FILE_BASE_NAME = packageInfo.appid ? packageInfo.appid : (packageInfo.name ? packageInfo.name : 'dist');
    const DIST_VERSION = (packageInfo.version ? packageInfo.version : '0.0.0').replace(/\./g, '_');
    const DIST_FILE = path.resolve(DIST_DIR, `${DIST_FILE_BASE_NAME}.${DIST_VERSION}.amr`)
    return DIST_FILE
  },

  /**
   * 判断是否要全部打包成一个jsbundle
   * 应用配置了single-js-bundle为true,或者页面数量等于1,则打成一个独立的jsbundle
   */
  isSingleJsbundle() {
    if (_isSingleJsbundle === -1) {
      const packageInfo = this.getAppPackageInfo();
      if (packageInfo["single-js-bundle"] === true) {
        _isSingleJsbundle = 1;
      } else {
        let meta = this.getAppMeta();
        let pages = meta.pages;
        _isSingleJsbundle = Object.keys(pages).length === 1 ? 1 : 0;
      }
    }
    return _isSingleJsbundle === 1;
  },

  /**
   * 获取所有输入点,包括page和app.js
   */
  getAppMeta() {
    return _app_meta;
  },
  async _initAppMeta() {
    let appJsonPath = path.resolve(this.getAppSourceDir(), APP_JSON_FILE_NAME);
    if (fs.existsSync(appJsonPath)) {
      _app_meta = require(appJsonPath);
    } else {
      log.error('app-meta.js is deprecated! use app.json instead!');
      let metaPath = path.resolve(this.getAppSourceDir(), APP_META_FILE_NAME);
      let metaTempPath = path.resolve(this.getFalconBuildDir(), APP_META_TEMP_FILE_NAME);
      fs.copyFileSync(metaPath, metaTempPath);

      const appMetaMod = await import((isWin ? 'file://' : '') + metaTempPath);
      if (fs.existsSync(metaTempPath)) {
        fs.unlinkSync(metaTempPath);
      }
      _app_meta = appMetaMod.default
    }
  },

  /**
   * 获取打包入口文件
   */
  getInputs() {
    let input = {};
    //app.js入口固定!
    input.app = this.pathResolve(`${APP_SOURCE_DIR}/${APP_ENTRY_FILE_NAME}`);
    const isSingle = this.isSingleJsbundle();
    if (!isSingle) {
      let meta = this.getAppMeta();
      let pages = meta.pages;
      for (const page in pages) {
        if (input[page]) {
          throw new Error('Duplicate page name:', page);
        }
        input[page] = this.pathResolve(`${APP_SOURCE_DIR}/${pages[page]}`);
      }
    }
    Object.assign(input, this.getServiceInputs())
    Object.assign(input, this.getProviderInputs())
    return input;
  },

  /**
   * 获取 services 打包入口文件
   */
  getServiceInputs() {
    let input = {};

    let meta = this.getAppMeta();
    let items = meta.services;
    for (const name in items) {
      if (input[name]) {
        throw new Error('Duplicate service name:', name);
      }
      input['services/'+name] = this.pathResolve(`${APP_SOURCE_DIR}/${items[name]}`);
    }

    return input;
  },

  /**
   * 获取 providers 打包入口文件
   */
  getProviderInputs() {
    let input = {};

    let meta = this.getAppMeta();
    let items = meta.providers;
    for (const name in items) {
      if (input[name]) {
        throw new Error('Duplicate provider name:', name);
      }
      input['providers/'+name] = this.pathResolve(`${APP_SOURCE_DIR}/${items[name]}`);
    }

    return input;
  },

  /**
   * 与根目录的相对路径
   * @param {String} target 目标文件或目录
   */
  pathToRoot(target) {
    return path.relative(this.getAppRoot(), target);
  },
  pathToRootUnix(target) {
    return path.relative(this.getAppRoot(), target).replace(/\\/g, '/')
  },
  /**
   * 以待打包目录的根目录为base,返回target对应的目录
   * @param  {...any} target 
   */
  pathResolve(...target) {
    target.unshift(this.getAppRoot());
    return path.resolve.apply(path, target);
  }
}

module.exports = appInfo;
