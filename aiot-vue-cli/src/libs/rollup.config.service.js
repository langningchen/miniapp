/**
 * rollup打包配置生成
 */
const fs = require('fs')
const path = require('path');

const { nodeResolve } = require('@rollup/plugin-node-resolve');
const alias = require('@rollup/plugin-alias');
const commonjs = require('@rollup/plugin-commonjs');
const { terser } = require('rollup-plugin-terser');
const pluginJson = require('@rollup/plugin-json');
const pluginVirtual = require('@rollup/plugin-virtual')

const info = require('./appinfo');

const pluginFalconModule = require('../rollup-plugins/falcon-module');
const {getMockApi} = require('./common.js')

function getManualChunks(inputs) {
  return function (id, manualChunks) {
    //暂时不用处理
  }
}

function generateCommonConfig(appMetaOptions, options, type) {
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
  const input = {
    external: ['vue', 'falcon-vue-render'],
    plugins: [
      pluginVirtual({
        ...mockSources,
      }),
      nodeResolve(),
      commonjs(),

      pluginJson(),

      alias({
        entries: [
          { find: '@', replacement: path.resolve(info.getAppRoot(), 'src') },
          ...customAlias,
        ]
      }),

      pluginFalconModule() //把模块的插件放在最后,上面无法解析的import内容交给模块解析插件
    ]
  }

  let dir
  if (type === 'service') {
    dir = info.getServiceBuildDir()
  } else if (type === 'provider') {
    dir = info.getProviderBuildDir()
  }
  const output = {
    format: 'es',
    dir,
    exports: 'auto',
  }

  return { input, output }
}

async function getConfig(options, type) {
  const appMeta = info.getAppMeta();
  const appMetaOptions = appMeta.options || {}

  const { input, output } = generateCommonConfig(appMetaOptions, options, type);

  if (type === 'service') {
    input.input = info.getServiceInputs();
  } else if (type === 'provider') {
    input.input = info.getProviderInputs();
  }

  output.manualChunks = getManualChunks(input.input);

  if (options.minify) {
    input.plugins.push(terser());
  }

  return {
    input,
    output
  };
};

async function getConfigService(options) {
  return getConfig(options, 'service')
};

async function getConfigProvider(options) {
  return getConfig(options, 'provider')
};

module.exports = {
  getConfigService,
  getConfigProvider,
}

