import fs, { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import path, { extname, resolve } from 'path';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import type { Plugin } from 'rollup';
import { getBuildTempFileDir, getFalconBuildDir, pathToRoot } from '../libs/appinfo';
import { md5 } from '../libs/helper';
import { Readable } from 'stream';
import { writeFile } from 'fs/promises';

interface ImageOptions {
  dom?: boolean; // TO-DO: this options seems unused
  exclude?: FilterPattern;
  include?: FilterPattern;
}

export const isHttpUrl = (url: string) => {
  return REG_HTTP.test(url);
};

export const download = async (url: string): Promise<string> => {
  const tmpFileDir = getBuildTempFileDir();
  const tempFilePath = resolve(tmpFileDir, md5(url) + path.extname(url));
  if (existsSync(tempFilePath)) return tempFilePath;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`图片 ${url} 加载失败`);
  if (!res.body) throw new Error(`图片 ${url} 没有响应`);
  await writeFile(tempFilePath, Readable.fromWeb(res.body));
  return tempFilePath;
};

interface ImageInfo {
  id: string;
  file: string;
  ext: string;
  mime: string;
  pathToRoot: string;
  format: 'file' | 'base64';
  isBase64: boolean;
  isDownload: boolean;
  isHttp: boolean;
  needDownload: boolean;
}

const REG_BASE64 = /[\?\&]base64/;
const REG_DOWNLOAD = /[\?\&]download/;
const REG_HTTP = /http[s]{0,1}:\/\/([\w.]+\/?)\S*/;
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.apng': 'image/apng',
  '.svg': 'image/svg',
};

export const getImageInfo = (id: string): ImageInfo => {
  const file = id.replace(REG_BASE64, '').replace(REG_DOWNLOAD, '');
  const ext = extname(file);
  const mime = mimeTypes[ext];
  const isBase64 = REG_BASE64.test(id);
  const isHttp = REG_HTTP.test(id);
  const isDownload = REG_DOWNLOAD.test(id);
  if (!mime) throw new Error(`不支持的图片类型 ${id}`);

  return {
    id,
    file,
    ext,
    mime,
    pathToRoot: pathToRoot(file),
    format: REG_BASE64.test(id) ? 'base64' : 'file',
    isBase64,
    isDownload,
    isHttp,
    needDownload: isHttp && (isDownload || isBase64),
  };
};

const PROCESS_SUFFIX = '?needProcess';

export default (opts: ImageOptions = {}): Plugin => {
  const filter = createFilter(opts.include, opts.exclude);

  return {
    name: 'image',
    resolveId(id, _importer) {
      const imgInfo = getImageInfo(id);
      if (!imgInfo?.mime) return null;
      return `${id}${PROCESS_SUFFIX}`;
    },
    async load(id) {
      if (!filter(id)) return null;
      if (id.endsWith(PROCESS_SUFFIX)) id = id.replace(PROCESS_SUFFIX, '');

      const imgInfo = getImageInfo(id);
      if (!imgInfo?.mime) return null;
      if (imgInfo.isHttp) {
        if (!imgInfo.needDownload) return `export default '${id}'`;
        const path = await download(imgInfo.file);
        imgInfo.file = path;
        imgInfo.pathToRoot = pathToRoot(path);
      }

      if (imgInfo.format == 'base64') {
        const source = readFileSync(imgInfo.file, 'base64');
        return `export default image = "data:${imgInfo.mime};base64,${source}";`;
      }
      const fileName = md5(imgInfo.pathToRoot) + imgInfo.ext;
      const tempImagesDir = resolve(getFalconBuildDir(), 'images');
      if (!existsSync(tempImagesDir)) mkdirSync(tempImagesDir);
      const distImageFile = resolve(tempImagesDir, fileName);
      copyFileSync(imgInfo.file, distImageFile);
      return `export default "images/${fileName}"`;
    },
  };
};
