/**
 * 开放给外部的功能
 */
import { rollup } from 'rollup';
import { getConfig } from './libs/rollup.config';
import { init } from './libs/appinfo';
export * from './webpreview';

/**
 * 构建组件或工程
 * @param {Object} config 构建配置
 */
export async function build(config) {
  const { entry, excludes, outputDir, minify, mock } = config;
  const { input, output } = getConfig({ minify, mock });
  input.input = entry;
  input.external = excludes;
  output.dir = outputDir;

  const appBundle = await rollup(input);
  await appBundle.write(output);
}

export async function setAppRoot(appRoot) {
  await init(appRoot);
}
