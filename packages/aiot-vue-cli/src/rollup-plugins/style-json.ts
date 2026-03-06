import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve as pathResolve, relative } from 'node:path';

import { log } from '@clack/prompts';
import { createFilter } from '@rollup/pluginutils';
import styler from 'falcon-styler';
import less from 'less';
import type { Plugin } from 'rollup';
import * as appInfo from '../libs/appinfo.js';
import { getLessPaths } from '../libs/common.js';
import * as helper from '../libs/helper.js';
import { state } from '../libs/share.js';
import { download, parseImageInfo } from './image.js';

const filter = createFilter(['**/*.css', '**/*.less', '**/*.sass', '**/*.stylus']);

const REG_BACKGROUND = /\burl\s*\(\s*["']?([^"'\r\n,]+)["']?\s*\)/;

interface StylerLogItem {
  line: number;
  column: number;
  reason: string;
}

interface StylerResult {
  log: StylerLogItem[];
  jsonStyle: Record<string, Record<string, string>>;
}

async function resolveBgImageUrl(filePath: string): Promise<string | null> {
  const imgInfo = parseImageInfo(filePath);
  if (!imgInfo.mime) return null;

  if (imgInfo.isHttp && !imgInfo.needDownload) return imgInfo.file;

  if (imgInfo.needDownload) {
    try {
      const localPath = await download(imgInfo.file);
      imgInfo.file = localPath;
      imgInfo.pathToRoot = appInfo.pathToRoot(localPath);
    } catch (e) {
      log.error(
        `Failed to download background image: ${imgInfo.file}\n${e instanceof Error ? e.message : e}`,
      );
      return imgInfo.file;
    }
  }

  if (imgInfo.isBase64) {
    const source = readFileSync(imgInfo.file, 'base64').replace(/[\r\n]+/gm, '');
    if (!source) {
      log.warn(`Failed to convert base64, using original URL: ${imgInfo.id}`);
      return imgInfo.id;
    }
    return `data:${imgInfo.mime};base64,${source}`;
  }

  const fileName = helper.md5(imgInfo.pathToRoot) + imgInfo.ext;
  const imagesDir = pathResolve(appInfo.getFalconBuildDir(), 'images');
  if (!existsSync(imagesDir)) mkdirSync(imagesDir);
  copyFileSync(imgInfo.file, pathResolve(imagesDir, fileName));
  return `images/${fileName}`;
}

async function replaceBgImages(
  id: string,
  styleList: Record<string, Record<string, string>>,
): Promise<void> {
  for (const style of Object.values(styleList)) {
    for (const [name, value] of Object.entries(style)) {
      if (!name.startsWith('backgroundImage')) continue;

      const match = value.match(REG_BACKGROUND);
      if (!match?.[1]) continue;

      const isHttp = /^https?:\/\//.test(match[1]);
      const filePath = isHttp ? match[1] : pathResolve(dirname(id), match[1]);
      const result = await resolveBgImageUrl(filePath);
      if (result) style[name] = `url("${result}")`;
    }
  }
}

function printStylerLog(id: string, items: StylerLogItem[]): void {
  const rel = relative(appInfo.getAppSourceDir(), id);
  for (const item of items) {
    log.warn(`${rel}:${item.line}-${item.column}\n${item.reason}`);
  }
}

function extractKeyframes(id: string, result: Record<string, Record<string, string>>): void {
  const scopeId = helper.parseQuery(id.split('?')[1] ?? '')?.scopeId;
  if (!scopeId) return;

  const keyframes = result['@KEYFRAME'];
  if (keyframes) {
    delete result['@KEYFRAME'];
    for (const [name, value] of Object.entries(keyframes)) {
      state.keyframes.push({ [`${name}${scopeId}`]: value });
    }
  }

  for (const style of Object.values(result)) {
    if (style.animationName) {
      style.animationName += scopeId;
    }
  }
}

function parseStyle(id: string, input: string): Record<string, Record<string, string>> | null {
  let parsed: Record<string, Record<string, string>> | null = null;

  styler.parse(input, (_err: unknown, obj: StylerResult) => {
    printStylerLog(id, obj.log);
    if (obj?.jsonStyle) parsed = obj.jsonStyle;
  });

  return parsed;
}

async function compileToJson(code: string, id: string, paths: string[]): Promise<string> {
  let css = code;

  if (extname(id) === '.less') {
    const result = await less.render(code, { paths });
    css = result.css;
  }

  const parsed = parseStyle(id, css);
  if (!parsed) return 'export default {}';

  await replaceBgImages(id, parsed);
  extractKeyframes(id, parsed);

  return JSON.stringify(parsed, null, 2);
}

function style2JSON(appMetaOptions?: Record<string, unknown>): Plugin {
  return {
    name: 'aiot-style2json',

    async transform(code, id) {
      if (!filter(id)) return null;

      const styleOpts = appMetaOptions ?? {};
      const themes = (styleOpts.themes as string[] | undefined) ?? [];
      const themeStyles: Record<string, string> = {};

      for (const theme of [undefined, ...themes]) {
        const opts = { ...styleOpts, theme: theme ?? styleOpts.theme };
        const paths = [dirname(id), ...getLessPaths(opts)];
        themeStyles[theme ?? '_'] = await compileToJson(code, id, paths);
      }

      const entries = Object.entries(themeStyles)
        .map(([key, val]) => `"${key}": ${val}`)
        .join(', ');

      return `export default { ${entries} }`;
    },
  };
}

export default style2JSON;
