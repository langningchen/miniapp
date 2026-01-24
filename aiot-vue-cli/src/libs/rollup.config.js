/**
 * rollup打包配置生成
 */
const fs = require('fs')
const path = require('path');

const { nodeResolve } = require('@rollup/plugin-node-resolve');
const alias = require('@rollup/plugin-alias');
const replace = require('@rollup/plugin-replace');
const commonjs = require('@rollup/plugin-commonjs');
const { terser } = require('rollup-plugin-terser');
const pluginJson = require('@rollup/plugin-json');
const pluginVirtual = require('@rollup/plugin-virtual')

const info = require('./appinfo');

const pluginVue = require('../rollup-plugins/falcon-vue');
const styleJson = require('../rollup-plugins/style-json');
const assetPlugin = require('../rollup-plugins/asset')
const pluginImage = require('../rollup-plugins/image');
const pluginApp = require('../rollup-plugins/app');
const pluginFalconModule = require('../rollup-plugins/falcon-module');
// const pluginVue = require('../rollup-plugins/vue');
// const pluginVue = require('rollup-plugin-vue');
const {getThemeImportSource, getMockApi} = require('./common.js')

function getManualChunks(inputs) {
  return function (id, manualChunks) {
    //暂时不用处理
  }
}

function generateCommonConfig(appMetaOptions, options) {
  let styleOpts = appMetaOptions.style || {}
  let mockSources = {}
  if (options.mock === true) {
    mockSources = getMockApi()
    for (let key of Object.keys(mockSources)) {
      mockSources[key] = fs.readFileSync(mockSources[key], 'utf8')
    }
  }
  const customAlias = []
  if (appMetaOptions.alias) {
    for (let key of Object.keys(appMetaOptions.alias)) {
      customAlias.push({find: key, replacement: path.resolve(info.getAppRoot(), appMetaOptions.alias[key])})
    }
  }
  const replaceValues = { 'defineComponent': '' }
  if (options.env) {
    for (const item of options.env) {
      const slist = item.split('=')
      if (slist.length === 1) {
        replaceValues[slist[0].trim()] = 'true'
      } else if (slist.length > 1) {
        replaceValues[slist[0].trim()] = JSON.stringify(slist[1].trim())
      }
    }
  }
  const input = {
    external: ['vue', 'falcon-vue-render'],
    treeshake: {
      preset: 'smallest',
    },
    plugins: [
      pluginVirtual({
        ...getThemeImportSource(styleOpts),
        ...mockSources,
      }),
      nodeResolve(),
      commonjs(),require('@rollup/plugin-typescript')(),
      pluginApp(),
      pluginImage(),
      assetPlugin(),
      styleJson(appMetaOptions, info.getAppRoot()),
      pluginJson(),
      pluginVue(),  //{ template: { optimizeSSR: false }, needMap: false, css: true }
      alias({
        entries: [
          { find: '@', replacement: path.resolve(info.getAppRoot(), 'src') },
          ...customAlias,
        ]
      }),
      replace({
        values: replaceValues,
        preventAssignment: true,
      }),

      pluginFalconModule() //把模块的插件放在最后,上面无法解析的import内容交给模块解析插件
    ]
  }

  const output = {
    format: 'es',
    dir: info.getFalconBuildDir(),
    exports: 'auto',
    assetFileNames: "assets/[name][extname]"
  }

  return { input, output }
}

module.exports = async function getConfig(options) {
  const appMeta = info.getAppMeta();
  const appMetaOptions = appMeta.options || {}

  const { input, output } = generateCommonConfig(appMetaOptions, options);

  input.input = info.getInputs();
  output.manualChunks = getManualChunks(input.input);

  if (options.minify) {
    input.plugins.push(terser());
  }

  return {
    input,
    output
  };
};

module.exports.generateCommonConfig = generateCommonConfig;
