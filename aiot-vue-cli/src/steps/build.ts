/**
 * 构建主工程
 */
import { resolve } from 'path';
import fs, { cpSync, existsSync, readFileSync } from 'fs';

import {rollup} from 'rollup';

import { getConfig } from '../libs/rollup.config.js';
import share from '../libs/share.js';
import consola from 'consola';
import { APP_ENTRY_FILE_NAME, getAppRoot, getFalconBuildDir } from '../libs/appinfo.js';

export interface BuildConfig {
  minify: boolean;
  mock: boolean;
  env: string[];
}

export default async (opt: BuildConfig) => {
  const options = getConfig(opt);
  const appBundle = await rollup(options.input);
  await appBundle.write(options.output);

  appendKeyFrameCode();

  // NOTE: services and providers will generated in appBundle progress
  //const meta = getAppMeta();
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
  consola.success('应用构建成功,目录:', options.output.dir);
};

function appendKeyFrameCode() {
  if (share.keyframes.length === 0) {
    return;
  }
  //构建结束以后把keyframes信息写进App中
  const appFile = resolve(getFalconBuildDir(), APP_ENTRY_FILE_NAME);
  if (!fs.existsSync(appFile)) {
    console.error(`文件不存在:${appFile}`);
    return;
  }
  const appCode = readFileSync(appFile, 'utf-8');
  const keyFrameCode = `$falcon.__KEYFRAMES = ${JSON.stringify(share.keyframes)};\n`;
  fs.writeFileSync(appFile, appCode + keyFrameCode);
}

const copyDir = (dirName: string) => {
  const src = resolve(getAppRoot(), dirName);
  const dst = resolve(getFalconBuildDir(), dirName);
  if (existsSync(src)) {
    try {
      cpSync(src, dst, { recursive: true });
      consola.success(`${dirName} 同步成功: ${dst}`);
    } catch (err) {
      consola.error(`${dirName} 同步失败: ${src} -> ${dst}`);
      throw err;
    }
  }
};

const syncDirs = () => {
  copyDir('libs');
  copyDir('jsworkers');
  copyDir('assets');
};
