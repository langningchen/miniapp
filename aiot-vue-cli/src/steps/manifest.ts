import { basename, relative, resolve } from 'path';
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import {
  getAppMeta,
  getAppPackageInfo,
  getFalconBuildDir,
  pathResolve,
  type AppQuickJs,
} from '../libs/appinfo';
import consola from 'consola';

interface ManifestJson {
  appName: string;
  version: string;
  appid: string;
  icon?: string;
  quickjs?: AppQuickJs;
  meta?: unknown;
  props?: unknown;
  cert: Record<string, { size: number; md5: string }>;
}
export default () => {
  const DIST_DIR = getFalconBuildDir();
  const appPkg = getAppPackageInfo();
  const appJson = getAppMeta();

  if (!appJson) throw new Error('没有初始化');
  if (!appPkg.appid) {
    consola.error('未在 package.json 中配置应用的 appid');
    return;
  }

  const filesInfo: ManifestJson = {
    appName: appPkg.appName ?? appPkg.name ?? '未命名',
    version: appPkg.version ?? '0.0.0',
    appid: appPkg.appid,
    meta: appJson.meta,
    props: appJson.props,
    cert: {},
  };

  if (appPkg.quickjs) filesInfo.quickjs = appPkg.quickjs;

  if (appPkg.icon) {
    const iconFilePath = pathResolve(appPkg.icon);
    const distIconPath = resolve(DIST_DIR, basename(appPkg.icon));
    if (existsSync(iconFilePath)) copyFileSync(iconFilePath, distIconPath);
    filesInfo.icon = basename(appPkg.icon);
  } else consola.warn('未在 package.json 中配置应用 icon 路径');

  const files = readdirSync(DIST_DIR, { recursive: true, encoding: 'utf-8' });
  for (const file of files) {
    const fileStat = statSync(file);
    const relPath = relative(DIST_DIR, file).replaceAll('\\', '/');
    filesInfo.cert[relPath] = {
      size: fileStat.size,
      md5: getFileMd5(file),
    };
  }

  writeFileSync(resolve(DIST_DIR, 'manifest.json'), JSON.stringify(filesInfo, null, 2));
};

const getFileMd5 = (filePath: string) => {
  const hash = createHash('md5');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
};
