import { existsSync, mkdirSync, rmSync, unlinkSync } from 'fs';
import share from '../libs/share';
import build from '../steps/build';
import qjscAll from '../steps/qjsc';
import generateManifest from '../steps/manifest';
import packageZip from '../steps/pack';
import {
  getAmrPath,
  getAppPackageInfo,
  getBuildTempFileDir,
  getFalconBuildDir,
} from '../libs/appinfo';

const cleanup = () => {
  const falconBuildDir = getFalconBuildDir();
  rmSync(falconBuildDir, { recursive: true });
  mkdirSync(falconBuildDir);

  const tmpFileDir = getBuildTempFileDir();
  rmSync(tmpFileDir, { recursive: true });
  mkdirSync(tmpFileDir);

  const distFile = getAmrPath();
  if (existsSync(distFile)) unlinkSync(distFile);
};

interface BuildCmd {
  compress: boolean;
  qjsc: boolean;
  pack: boolean;
  mock: boolean;
  env: string[];
}

export default async ({ compress, qjsc, pack, mock, env }: BuildCmd) => {
  cleanup();

  const packageInfo = getAppPackageInfo();
  if (!packageInfo.appid) throw new Error('请配置 package.json 当中的 appid');

  await build({
    minify: compress,
    mock,
    env,
  });
  if (qjsc) await qjscAll(share.internalModules);
  if (pack) {
    generateManifest();
    await packageZip();
  }
  return 0;
};
