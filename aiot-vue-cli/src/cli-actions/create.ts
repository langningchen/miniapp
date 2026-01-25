import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import consola from 'consola';
import { zip } from 'compressing';

const TEMPLATE_ZIPFILE_PATH = resolve(__dirname, '../../assets/template.zip');

const modifyInfo = (distDir: string, name: string) => {
  const pkgJson = resolve(distDir, 'package.json');
  const appPkg = JSON.parse(readFileSync(pkgJson, 'utf-8'));
  appPkg.name = name;
  appPkg.appid = `800${Date.now()}`;
  writeFileSync(pkgJson, JSON.stringify(appPkg, null, 2));
};

export default async (name: string) => {
  const distDir = resolve(name);
  if (existsSync(distDir)) {
    consola.error(`目录或文件 ${distDir} 已经存在`);
    return;
  }
  await zip.uncompress(TEMPLATE_ZIPFILE_PATH, distDir);
  modifyInfo(distDir, name);
  consola.success(`创建成功，可以使用以下命令初始化应用：
cd ${name}
pnpm install`);
};
