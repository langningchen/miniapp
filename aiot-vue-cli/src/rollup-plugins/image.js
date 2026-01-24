/**
 * 图片加载插件
 */

const fs = require('fs');
const path = require('path');
const helper = require('../libs/helper');
const { createFilter } = require('@rollup/pluginutils');
const appInfo = require('../libs/appinfo');
const http = require('http');
const https = require('https');

const defaults = {
  dom: false,
  exclude: null,
  include: null
};

const REG_BASE64 = /[\?\&]base64/;
const REG_DOWNLOAD = /[\?\&]download/;
const REG_HTTP = /http[s]{0,1}:\/\/([\w.]+\/?)\S*/;

const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.apng': 'image/apng',
  '.svg': 'image/svg',
};

function isHttpUrl(url) {
  return REG_HTTP.test(url)
}

function download(url) {
  return new Promise((resolve, reject) => {
    if (!/^http(s)?/.test(url)) {
      console.warn('invalid url:', url);
      reject(null);
      return;
    }
    const httpClient = url.startsWith('https') ? https : http;
    const tmpFileDir = appInfo.getBuildTempFileDir();
    const tempFilePath = path.resolve(tmpFileDir, helper.md5(url) + path.extname(url));
    if (fs.existsSync(tempFilePath)) {  //已经下载过了
      resolve(tempFilePath);
      return;
    }
    const fileStream = fs.createWriteStream(tempFilePath);
    httpClient.get(url, function (response) {
      response.pipe(fileStream);
      fileStream.on('finish', function () {
        fileStream.close();  // close() is async, call cb after close completes.
        resolve(tempFilePath);
      });
    }).on('error', function (err) { // Handle errors
      fs.unlink(tempFilePath); // Delete the file async. (But we don't check the result)
      console.log(err);
      reject(null);
    });
  });
}

function getImageInfo(id) {
  const info = {
    id: id,
    file: id,
    pathToRoot: appInfo.pathToRoot(id),
    format: 'file'
  };

  info.isBase64 = REG_BASE64.test(id);
  info.isDownload = REG_DOWNLOAD.test(id);

  info.isHttp = REG_HTTP.test(id);
  info.needDownload = info.isHttp && (info.isDownload || info.isBase64);

  if (info.isBase64) {
    info.format = 'base64';
  }

  info.file = id.replace(REG_BASE64, '').replace(REG_DOWNLOAD, '');
  info.pathToRoot = appInfo.pathToRoot(info.file);

  info.ext = path.extname(info.file);
  info.mime = mimeTypes[info.ext];

  return info;
}

const constTemplate = ({ dataUri }) => `
  const img = "${dataUri}";
  export default img;
`;

const getDataUri = ({ format, mime, source }) => `data:${mime};${format},${source}`;

function image(opts = {}) {
  const options = Object.assign({}, defaults, opts);
  const filter = createFilter(options.include, options.exclude);

  return {
    name: 'image',
    resolveId(id, importer) {
      const imgInfo = getImageInfo(id);
      if (!imgInfo || !imgInfo.mime) {
        // not an image
        return null;
      }
      return '__http_image_loader.js__$' + id;
    },
    async load(id) {
      if (!filter(id)) {
        return null;
      }

      if (id.startsWith('__http_image_loader.js__$')) {
        id = id.replace('__http_image_loader.js__$', '');
      }

      let imgInfo = getImageInfo(id);
      if (!imgInfo || !imgInfo.mime) {
        // not an image
        return null;
      }

      //网络图片
      if (imgInfo.isHttp) {
        //不用下载,直接原图
        if (!imgInfo.needDownload) {
          return `export default '${id}'`;
        } else {  //先下载
          let path = null;
          try {
            path = await download(imgInfo.file);
          } catch (e) {
            console.error('图片下载失败:', imgInfo.file, e);
          }
          if (!path) {  //下载失败,用原来的http地址
            return `export default '${id}'`;
          } else {
            //下载成功,重置一下图片信息
            imgInfo.file = path;
            imgInfo.pathToRoot = appInfo.pathToRoot(path);
          }
        }
      }

      const mime = imgInfo.mime;

      if (imgInfo.format == 'base64') {
        const format = 'base64';
        const source = fs.readFileSync(imgInfo.file, format).replace(/[\r\n]+/gm, '');
        if (!source) {
          console.warn('图片转base64失败,使用原始的图片地址:', imgInfo.id);
          return `export default '${id}'`;
        }
        const dataUri = getDataUri({ format, mime, source });
        const code = constTemplate({ dataUri });
        return code.trim();
      } else if (imgInfo.format == 'file') {
        //拷贝文件到images目录下,并且替换路径为类似:images/xxx.png
        const fileName = helper.md5(imgInfo.pathToRoot) + imgInfo.ext;
        const tempImagesDir = path.resolve(appInfo.getFalconBuildDir(), 'images');
        if (!fs.existsSync(tempImagesDir)) {
          fs.mkdirSync(tempImagesDir);
        }
        const distImageFile = path.resolve(tempImagesDir, fileName);
        fs.copyFileSync(imgInfo.file, distImageFile);
        return `export default "images/${fileName}"`;
      }

      throw Error('unhandled image!');
    }
  };
}

image.getImageInfo = getImageInfo;
image.download = download;
image.isHttpUrl = isHttpUrl;

module.exports = image;