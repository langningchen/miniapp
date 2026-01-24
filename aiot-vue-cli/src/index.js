/**
 * 开放给外部的功能
 */
const rollup = require('rollup');

const { getConfig } = require('./libs/rollup.config');
const AppInfo = require('./libs/appinfo');
const webPreview = require('./webpreview');

/**
 * 构建组件或工程
 * @param {Object} config 构建配置
 */
async function build(config) {
  const { entry, excludes, outputDir, minify, mock } = config
  const { input, output } = getConfig({ minify, mock })
  input.input = entry;
  input.external = excludes;
  output.dir = outputDir;

  const appBundle = await rollup.rollup(input);
  await appBundle.write(output);
}

module.exports.setAppRoot = async (appRoot) => {
  await AppInfo.init(appRoot);
}
module.exports.build = build;
module.exports.webPreview = webPreview;
