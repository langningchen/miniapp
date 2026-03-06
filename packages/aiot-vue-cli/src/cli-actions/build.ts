import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { getAmrPath, getBuildTempFileDir, getFalconBuildDir } from '../libs/appinfo.js';
import type { BuildOptions } from '../libs/rollup.config.js';
import { state } from '../libs/share.js';
import { build } from '../steps/build.js';
import { generate } from '../steps/manifest.js';
import { pack } from '../steps/pack.js';
import qjscAll from '../steps/qjsc.js';

export const deviceBuild = async ({ mock, env }: BuildOptions) => {
  const falconBuildDir = getFalconBuildDir();
  await rm(falconBuildDir, { recursive: true });
  await mkdir(falconBuildDir);

  const tmpFileDir = getBuildTempFileDir();
  await rm(tmpFileDir, { recursive: true });
  await mkdir(tmpFileDir);

  const amrFile = getAmrPath();
  if (existsSync(amrFile)) await rm(amrFile);

  await build({ mock, env });
  await qjscAll(state.internalModules || []);
  await generate();
  await pack();
};
