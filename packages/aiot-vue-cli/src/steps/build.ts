import { existsSync } from 'node:fs';
import { appendFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spinner } from '@clack/prompts';
import { rollup as _rollup } from 'rollup';
import { getAppEntryFile, getAppRoot, getFalconBuildDir } from '../libs/appinfo.js';
import { type BuildOptions, getConfig } from '../libs/rollup.config.js';
import { state } from '../libs/share.js';

export const build = async (opt: BuildOptions) => {
  const s = spinner();
  s.start('Building...');
  const options = await getConfig(opt);

  s.message('Bundling...');
  const appBundle = await _rollup(options.input);

  s.message('Writing bundle...');
  await appBundle.write(options.output);
  await appendFile(
    getAppEntryFile(),
    `$falcon.__KEYFRAMES = ${JSON.stringify(state.keyframes)};\n`,
  );

  s.message('Copying additional files...');
  await copyDir('libs');
  await copyDir('jsworkers');
  await copyDir('assets');

  s.stop('Build completed');
};

const copyDir = async (dirName: string) => {
  const src = resolve(getAppRoot(), dirName);
  const dst = resolve(getFalconBuildDir(), dirName);
  if (existsSync(src)) await cp(src, dst, { recursive: true });
};
