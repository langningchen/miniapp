import { createWriteStream, readdirSync } from 'node:fs';
import { resolve as pathResolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { log } from '@clack/prompts';
import { zip } from 'compressing';
import { getAmrPath, getFalconBuildDir } from '../libs/appinfo.js';

export async function pack(): Promise<void> {
  const distDir = getFalconBuildDir();
  const distFile = getAmrPath();

  const zipStream = new zip.Stream();
  const destStream = createWriteStream(distFile);

  readdirSync(distDir).forEach((file) => {
    zipStream.addEntry(pathResolve(distDir, file));
  });

  await pipeline(zipStream, destStream);
  log.success(`Package created at ${distFile}`);
}
