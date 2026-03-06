import { readdirSync, unlinkSync } from 'node:fs';
import { extname, resolve as pathResolve } from 'node:path';
import { progress } from '@clack/prompts';
import { compileJs as qjsCompile } from 'aiot-qjsc-tool/libs/qjsc.js';
import { getFalconBuildDir } from '../libs/appinfo.js';

export default async function compileAll(internalModules: string[]): Promise<void> {
  const buildDir = getFalconBuildDir();
  const files = (readdirSync(buildDir, { recursive: true }) as string[])
    .map((f) => pathResolve(buildDir, f))
    .filter((f) => extname(f) === '.js');

  const progressBar = progress({ size: files.length });
  progressBar.start(`Compiling ${files.length} JS files...`);

  const compiled: string[] = [];
  for (const inputFile of files) {
    const outputFile = `${inputFile}.bin`;
    const success = await qjsCompile(inputFile, outputFile, {
      version: '20200705',
      bigNum: false,
      module: true,
      internal: internalModules,
    });

    if (!success) {
      progressBar.stop();
      throw new Error(`Failed to compile ${inputFile}`);
    }

    compiled.push(inputFile);
    progressBar.advance(1, `Compiled ${inputFile} to ${outputFile}`);
  }
  progressBar.message(`Cleaning up...`);
  compiled.forEach((f) => {
    unlinkSync(f);
  });
  progressBar.stop(`Compiled`);
}
