import { readdirSync, unlinkSync } from 'fs';
import { extname } from 'path';
import { qjsCompile } from '../cli-libs';

import { getAppPackageInfo, getFalconBuildDir } from '../libs/appinfo';

export default async (internal) => {
  const falconBuildDir = getFalconBuildDir();
  const qjsOptions = getAppPackageInfo().quickjs || {};
  const version = qjsOptions.version || '20200705';
  const bigNum = qjsOptions.bigNum || false;

  const files = readdirSync(falconBuildDir, { recursive: true, encoding: 'utf-8' });
  const inputJsFiles = [];
  for (const file of files) {
    if (extname(file) == '.js' || extname(file) == '.ts') {
      const success = await qjsCompile(file, `${file}.bin`, {
        version,
        bigNum,
        module: true,
        internal,
      });
      if (!success) throw Error(`QuickJS 编译文件 ${file} 失败`);
      inputJsFiles.push(file);
    }
  }
  for (const file of inputJsFiles) unlinkSync(file);
};
