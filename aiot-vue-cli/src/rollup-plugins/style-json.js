/**
 * 样式解析成json插件
 */

const fs = require('fs');
const path = require('path');

const styler = require('../../cli-libs/index.js')['falcon-styler']
const less = require('less');
const pluginUtils = require('@rollup/pluginutils');

const helper = require('../libs/helper');
const log = require('../libs/log');
const appInfo = require('../libs/appinfo');
const share = require('../libs/share');
const image = require('./image');
const {getLessPaths, getLessModifyVars} = require('../libs/common.js')


const REG_BACKGROUND = /\burl\s*\(\s*["']?([^"'\r\n,]+)["']?\s*\)/;

var filter = pluginUtils.createFilter(['**/*.css', '**/*.less', '**/*.sass', '**/*.stylus']);

async function replaceBackgroundImageUrl(id, styleList) {
  for (const styleName in styleList) {
    const style = styleList[styleName];
    for (const name in style) {
      if (name.startsWith('backgroundImage')) {  // backgroundImage and backgroundImage:active
        const match = style[name].match(REG_BACKGROUND);
        if (match && match[1]) {
          const filePath = image.isHttpUrl(match[1]) ? match[1] : path.resolve(path.dirname(id), match[1]);
          const imageInfo = image.getImageInfo(filePath);
          if (imageInfo) {
            const result = await processBgImage(id, imageInfo);
            if (result) {
              style[name] = `url("${result}")`;
            }
          }
        }
      }
    }
  }
}

async function processBgImage(id, imgInfo) {
  //http图片,不需要下载,直接使用原来的地址
  if (!imgInfo.needDownload && imgInfo.isHttp) {
    return imgInfo.file;
  }
  if (imgInfo.needDownload) {
    let downloadPath = null;
    try {
      downloadPath = await image.download(imgInfo.file);
    } catch (e) {
      console.log('download fail:', e);
      //下载失败,用原来的地址
      return imgInfo.file;
    }
    if (downloadPath) {
      imgInfo.file = downloadPath;
      imgInfo.pathToRoot = appInfo.pathToRoot(imgInfo.file);
    }
  }
  if (imgInfo.isBase64) { //转成base64返回
    const source = fs.readFileSync(imgInfo.file, 'base64').replace(/[\r\n]+/gm, '');
    if (!source) {  //文件转base64失败
      log.warn('base64 fail, use origin uri:', imgInfo.id);
      return imgInfo.id;
    }
    return `data:${imgInfo.mime};base64,${source}`;
  } else {  //返回images/xxx.png的路径,并且把图片拷贝到images目录下
    const fileName = helper.md5(imgInfo.pathToRoot) + imgInfo.ext;
    const tempImagesDir = path.resolve(appInfo.getFalconBuildDir(), 'images');
    if (!fs.existsSync(tempImagesDir)) {
      fs.mkdirSync(tempImagesDir);
    }
    const distImageFile = path.resolve(tempImagesDir, fileName);
    fs.copyFileSync(imgInfo.file, distImageFile);
    return `images/${fileName}`;
  }
}

function printLog(id, msgArr) {
  const relativePath = path.relative(appInfo.getAppSourceDir(), id);
  msgArr.forEach(item => {
    log.warn(`${relativePath}:${item.line}-${item.column}\n${item.reason}`);
  });
}

function extractKeyframes(id, result) {
  const strQuery = id.split('?')[1];
  if (strQuery) {
    const query = helper.parseQuery(strQuery);
    const scopeId = query.scopeId;
    const keyframes = result['@KEYFRAME'];

    if (keyframes) {
      //添加scopId后存到全局的keyframe信息中
      delete result['@KEYFRAME'];
      for (const name in keyframes) {
        const result = {};
        result[name + scopeId] = keyframes[name];
        share.keyframes.push(result)
      }
    }

    for (let name in result) {
      const style = result[name];
      if (style['animationName']) {
        style['animationName'] = style['animationName'] + scopeId;
      }
    }
  }
}

async function genStyleString(id, input) {
  let result;
  styler.parse(input, function (err, obj) {
    printLog(id, obj.log)
    if (obj && obj.jsonStyle) {
      try {
        result = obj.jsonStyle;
      } catch (e) {
        console.log('error:', e.message);
      }
    }
  });

  await replaceBackgroundImageUrl(id, result);
  extractKeyframes(id, result);

  return JSON.stringify(result, null, 2);
}

async function style2JSON_One(code, id, lessModifyVars, lessPaths) {
  let cssCode = null;
  switch (path.extname(id)) {
    case '.css':
      cssCode = code;
      break;
    case '.less':
      const result = await less.render(code, {
        modifyVars: lessModifyVars,
        paths: lessPaths,
      });
      cssCode = result.css;
      break;
    case '.sass':

      break;
    case '.stylus':
      break;
  }
  return await genStyleString(id, cssCode);
}

function style2JSON(appMetaOptions, appRoot) {
  return {
    name: 'style2json',
    async transform(code, id) {

      if (!filter(id)) {
        return;
      }

      const styleOpts = appMetaOptions.style || {}
      const themeStyles = {}
      const tmpStyleOpts = JSON.parse(JSON.stringify(styleOpts))
      for (let theme of [undefined, ].concat(styleOpts.themes || [])) {
        tmpStyleOpts.theme = theme ? theme : styleOpts.theme
        const lessPaths = [path.dirname(id), ...getLessPaths(tmpStyleOpts)]
        const lessModifyVars = getLessModifyVars(tmpStyleOpts)
        const styleString = await style2JSON_One(code, id, lessModifyVars, lessPaths)
        themeStyles[theme || '_'] = styleString
      }
      const themeItems = []
      for (let key of Object.keys(themeStyles)) {
        themeItems.push(`"${key}": ${themeStyles[key]}`)
      }
      let ret = `export default { ${themeItems.join(', ')} }`
      return ret
    }
  }
}
module.exports = style2JSON;
