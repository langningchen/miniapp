import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, extname, resolve as pathResolve } from 'node:path';
import { log, spinner } from '@clack/prompts';
import { createFilter } from '@rollup/pluginutils';
import type { Plugin } from 'rollup';
import * as appInfo from '../libs/appinfo.js';
import * as helper from '../libs/helper.js';

const IMAGE_ID_NS = '\0aiot-image:';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.apng': 'image/apng',
  '.svg': 'image/svg+xml',
};

interface ImageInfo {
  id: string;
  file: string;
  pathToRoot: string;
  ext: string;
  mime: string | undefined;
  isHttp: boolean;
  isBase64: boolean;
  isDownload: boolean;
  needDownload: boolean;
  format: 'base64' | 'file';
}

interface ImagePluginOptions {
  include?: string | string[] | null;
  exclude?: string | string[] | null;
}

function parseImageInfo(id: string): ImageInfo {
  const isBase64 = /[?&]base64/.test(id);
  const isDownload = /[?&]download/.test(id);
  const isHttp = /^https?:\/\//.test(id);
  const file = id.replace(/[?&]base64/, '').replace(/[?&]download/, '');
  const ext = extname(file);

  return {
    id,
    file,
    pathToRoot: appInfo.pathToRoot(file),
    ext,
    mime: MIME_TYPES[ext],
    isHttp,
    isBase64,
    isDownload,
    needDownload: isHttp && (isDownload || isBase64),
    format: isBase64 ? 'base64' : 'file',
  };
}

async function download(url: string): Promise<string> {
  const tmpDir = appInfo.getBuildTempFileDir();
  const tmpPath = pathResolve(tmpDir, helper.md5(url) + extname(url));

  if (existsSync(tmpPath)) return tmpPath;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);

  const buffer = await response.arrayBuffer();
  await writeFile(tmpPath, Buffer.from(buffer));

  return tmpPath;
}

function renderBase64(info: ImageInfo): string {
  const source = readFileSync(info.file, 'base64').replace(/[\r\n]+/gm, '');
  if (!source) return `export default '${info.id}';`;
  return `const img = "data:${info.mime};base64,${source}";\nexport default img;`;
}

function renderFile(info: ImageInfo): string {
  const fileName = helper.md5(info.pathToRoot) + info.ext;
  const imagesDir = pathResolve(appInfo.getFalconBuildDir(), 'images');
  if (!existsSync(imagesDir)) mkdirSync(imagesDir);
  copyFileSync(info.file, pathResolve(imagesDir, fileName));
  return `export default "images/${fileName}";`;
}

function image(opts: ImagePluginOptions = {}): Plugin {
  const filter = createFilter(opts.include, opts.exclude);

  return {
    name: 'aiot-image',

    resolveId(id, importer) {
      if (id.startsWith(IMAGE_ID_NS)) return id;

      const absId = id.startsWith('.') && importer ? pathResolve(dirname(importer), id) : id;

      if (!MIME_TYPES[extname(absId)]) return null;

      return IMAGE_ID_NS + absId;
    },

    async load(id) {
      if (!id.startsWith(IMAGE_ID_NS)) return null;

      const rawId = id.slice(IMAGE_ID_NS.length);
      if (!filter(rawId)) return null;

      const info = parseImageInfo(rawId);
      if (!info.mime) return null;

      if (info.isHttp) {
        if (!info.needDownload) return `export default '${rawId}';`;

        const spin = spinner();
        spin.start(`Downloading image ${info.file}...`);
        try {
          const localPath = await download(info.file);
          spin.stop(`Downloaded ${info.file}`);
          info.file = localPath;
          info.pathToRoot = appInfo.pathToRoot(localPath);
        } catch (e) {
          spin.stop();
          log.error(
            `Failed to download image: ${info.file}\n${e instanceof Error ? e.message : e}`,
          );
          return `export default '${rawId}';`;
        }
      }

      if (info.format === 'base64') return renderBase64(info);
      if (info.format === 'file') return renderFile(info);

      throw new Error(`Unhandled image format: ${rawId}`);
    },
  };
}

export { parseImageInfo, download };
export default image;
