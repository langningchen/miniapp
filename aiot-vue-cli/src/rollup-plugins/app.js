/**
 * 负责app.js文件
 */
const path = require('path');
const _ = require('lodash');
const appInfo = require('../libs/appinfo');
const helper = require('../libs/helper');

// 原始app.js后缀
const ORIGIN_APP_JS_SUFFIX = '?from=originapp.js';
/**
 * 生成页面的import
 */
function generatePagesImports() {
  const isSingle = appInfo.isSingleJsbundle();
  if (!isSingle) {
    return '';
  }
  let strResult = '\nApp.__pages = {};';
  const meta = appInfo.getAppMeta();
  const pages = meta.pages
  for (const p in pages) {
    const page = "_" + _.camelCase(p);  //加前缀,防止页面名称和保留关键字冲突
    strResult += `
import ${page} from './${pages[p]}';
App.__pages['${p}'] = ${page};
    `;
  }
  return strResult;
}

function appPreprocess() {
  const appFileId = appInfo.getAppEntryFile();
  return {
    name: 'app',
    async load(id) {
      if (id.endsWith(ORIGIN_APP_JS_SUFFIX)) {
        return helper.getContent(appFileId);
      }
    },
    async transform(code, id) {
      if (id !== appFileId) {
        return;
      }
      const meta = appInfo.getAppMeta();
      const pagesImports = generatePagesImports();
      const packageInfo = appInfo.getAppPackageInfo();
      const resultCode = `
import App from './app.js${ORIGIN_APP_JS_SUFFIX}';
App.meta = ${JSON.stringify(meta, null, 2)};
App.meta.name = '${packageInfo.name}';
App.meta.version = '${packageInfo.version}';
App.meta.isSingleJsBundle = ${packageInfo['single-js-bundle'] === true ? true : false};
$falcon.__AppClazz = App;
$falcon.__loadModuleDefault = async function (fileName) {
  if(App.__pages && App.__pages[fileName]){
    return App.__pages[fileName];
  } else {
    try{
      const pagePath = './' + fileName + '.js';
      let mod = await import(pagePath);
      return mod.default;
    } catch(e){
      console.log(e.message, e.stack);
    }
  }
}` + pagesImports;
      return resultCode;
    }
  };
}

module.exports = appPreprocess;