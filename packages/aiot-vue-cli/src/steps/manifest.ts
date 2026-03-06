import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { getAppPackageInfo, getFalconBuildDir, pathResolve } from '../libs/appinfo.js';

interface Manifest {
  appName: string;
  version: string;
  appid: string;
  icon: string;
}

export async function generate(): Promise<void> {
  const distDir = getFalconBuildDir();
  const appPkg = getAppPackageInfo();

  const manifest: Manifest = {
    appName: appPkg.appName,
    version: appPkg.version,
    appid: appPkg.appid,
    icon: basename(appPkg.icon),
  };

  const src = pathResolve(appPkg.icon);
  if (existsSync(src)) copyFileSync(src, resolve(distDir, manifest.icon));

  writeFileSync(resolve(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}
