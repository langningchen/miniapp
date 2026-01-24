const path = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');
const config = require('./config');
const helper = require('./helper');
const glob = require('glob');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const SpreadPlugin = require('@sucrase/webpack-object-rest-spread-plugin');
const vueLoaderConfig = require('./vue-loader.conf');
const appInfo = require('../../libs/appinfo');
const {getThemeImportSource} = require('../../libs/common.js')
const vueWebTemp = helper.rootNode(config.templateDir);
const hasPluginInstalled = fs.existsSync(helper.rootNode(config.pluginFilePath));
const isWin = /^win/.test(process.platform);
const webEntry = {};
const {getLessPaths, getLessModifyVars, getMockApi} = require('../../libs/common.js')

const webPaths = require('../../../web-libs/web-index.js')

// Wraping the entry file for web.
const getWebEntryFileContent = (entryPath, vueFilePath) => {
  let relativeVuePath = path.relative(path.join(entryPath, '../'), vueFilePath);
  // let relativeEntryPath = helper.root(config.entryFilePath);
  let relativePluginPath = helper.rootNode(config.pluginFilePath);

  let contents = '';

  let entryContents = `import Vue from '${webPaths["vue"].replace(/\\/g, '\\\\')}';
import weex from '${webPaths["falcon-vue-render"].replace(/\\/g, '\\\\')}';

weex.init(Vue);
`;

  // let entryContents = fs.readFileSync(relativeEntryPath).toString();
  if (isWin) {
    relativeVuePath = relativeVuePath.replace(/\\/g, '\\\\');
    relativePluginPath = relativePluginPath.replace(/\\/g, '\\\\');
  }
  if (hasPluginInstalled) {
    contents += `\n// If detact plugins/plugin.js is exist, import and the plugin.js\n`;
    contents += `import plugins from '${relativePluginPath}';\n`;
    contents += `plugins.forEach(function (plugin) {\n\tweex.install(plugin)\n});\n\n`;
    entryContents = entryContents.replace(/weex\.init/, match => `${contents}${match}`);
    contents = ''
  }
  contents += `
const App = require('${relativeVuePath}');
if(!window.$falcon){
  console.error('boot fail! please open _preview.app.html to preview app!');
} else {
  $falcon._web_boot_page(App, Vue, window);
}`;
  return entryContents + contents;
}

// Wraping the entry file for native.
const getNativeEntryFileContent = (entryPath, vueFilePath) => {
  let relativeVuePath = path.relative(path.join(entryPath, '../'), vueFilePath);
  let contents = '';
  if (isWin) {
    relativeVuePath = relativeVuePath.replace(/\\/g, '\\\\');
  }
  contents += `import App from '${relativeVuePath}'
new Vue(App)
`;

  return contents;
}

// 在.temp目录下生成app.js
function generateAppEntryFile(sourceDir) {
  //add app.web.js entry
  const templatePathForWeb = path.join(vueWebTemp, 'app.web.js');
  const appContent = `
import AppJson from '../src/app.json';
import App from '../src/app.js';
$falcon._web_boot_app(App, AppJson);
  `;
  fs.outputFileSync(templatePathForWeb, appContent);

  webEntry['app'] = templatePathForWeb;
}

// Retrieve entry file mappings by function recursion
const getEntryFile = (dir) => {
  dir = dir || path.resolve(appInfo.getAppRoot(), config.sourceDir);

  if (!fs.existsSync(config.templateDir)) {
    fs.mkdirSync(config.templateDir);
  }

  generateAppEntryFile(dir);

  let metaPath = path.resolve(dir, 'app.json');
  const appJson = require(metaPath);

  for (var page in appJson.pages) {
    const entry = appJson.pages[page];
    const templatePathForWeb = path.join(vueWebTemp, page + '.web.js');
    fs.outputFileSync(templatePathForWeb, getWebEntryFileContent(templatePathForWeb, `${dir}/${entry}`));

    webEntry[page] = templatePathForWeb;
  }
}

module.exports = async (isWebBuild) => {
  const appMeta = appInfo.getAppMeta()
  const appMetaOptions = appMeta.options || {}
  const styleOpts = appMetaOptions.style || {}

  const {FALCON_THEME, FALCON_THEME_CUSTOM} = getThemeImportSource(styleOpts)

  const falconThemePath0 = path.resolve(appInfo.getAppRoot(), 'node_modules/falcon-ui/node_modules/FALCON_THEME.js')
  const falconThemePath1 = path.resolve(appInfo.getAppRoot(), 'node_modules/FALCON_THEME.js')
  const falconThemeCustomPath0 = path.resolve(appInfo.getAppRoot(), 'node_modules/falcon-ui/node_modules/FALCON_THEME_CUSTOM.js')
  const falconThemeCustomPath1 = path.resolve(appInfo.getAppRoot(), 'node_modules/FALCON_THEME_CUSTOM.js')

  if (fs.existsSync(path.dirname(falconThemePath0))) {
    fs.writeFileSync(falconThemePath0, FALCON_THEME)
  }
  if (fs.existsSync(path.dirname(falconThemePath1))) {
    fs.writeFileSync(falconThemePath1, FALCON_THEME)
  }

  if (fs.existsSync(path.dirname(falconThemeCustomPath0))) {
    fs.writeFileSync(falconThemeCustomPath0, FALCON_THEME_CUSTOM)
  }
  if (fs.existsSync(path.dirname(falconThemeCustomPath1))) {
    fs.writeFileSync(falconThemeCustomPath1, FALCON_THEME_CUSTOM)
  }

  const lessPaths = getLessPaths(styleOpts)
  const lessModifyVars = getLessModifyVars(styleOpts)

  // Generate an entry file array before writing a webpack configuration
  getEntryFile();

  /**
   * Plugins for webpack configuration.
   */
  const plugins = [
    /**
     * Plugin: webpack.DefinePlugin
     * Description: The DefinePlugin allows you to create global constants which can be configured at compile time. 
     *
     * See: https://webpack.js.org/plugins/define-plugin/
     */
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': config.dev.env
      }
    }),

    new ProgressBarPlugin(),
    /*
     * Plugin: BannerPlugin
     * Description: Adds a banner to the top of each generated chunk.
     * See: https://webpack.js.org/plugins/banner-plugin/
     */
    new webpack.BannerPlugin({
      banner: '// { "framework": "Vue"} \n',
      raw: true,
      exclude: 'Vue'
    }),
    new SpreadPlugin(),
  ];

  let _entry = Object.assign(webEntry, {
    'phantom-limb': [require.resolve('phantom-limb')],
    // 'vue': 'vue',
    // 'falcon-vue-render': 'falcon-vue-render'
  });

  //   let _entry = Object.assign(webEntry, {
  //   'vendor': [path.resolve(appInfo.getAppRoot(), (isWebBuild ? 'dist' : '.temp'), '_dll_vendor.js')],
  // });

  const customAlias = {}
  if (appMetaOptions.alias) {
    for (let key of Object.keys(appMetaOptions.alias)) {
      let val = appMetaOptions.alias[key]
      customAlias[key] = helper.resolve(val)
    }
  }

  const devRules = []
  const previewOptions = appInfo.getPreviewOptions()
  // if (previewOptions.jsLoaders) {
  //   devRules.push({
  //     test: /\.js$/,
  //     use: previewOptions.jsLoaders,
  //     exclude: config.excludeModuleReg
  //   })
  // }
  
  // Config for compile jsbundle for web.
  return {
    entry: _entry,
    output: {
      path: helper.rootNode('./dist'),
      filename: '[name].web.js'
    },
    /**
     * Options affecting the resolving of modules.
     * See http://webpack.github.io/docs/configuration.html#resolve
     */
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: {
        '@': helper.resolve('src'),
        ...getMockApi(),
        ...customAlias,
      }
    },
    resolveLoader: {
      modules: [
        path.resolve(__dirname, '../../../web-loaders'),
        path.resolve(__dirname, '../../../node_modules'),
        'node_modules',
      ]
    },
    /*
     * Options affecting the resolving of modules.
     *
     * See: http://webpack.github.io/docs/configuration.html#module
     */
    module: {
      // webpack 2.0 
      rules: [
        ...devRules,
        {
          test: /\.vue(\?[^?]+)?$/,
          use: [{
            loader: 'falcon-vue-loader',
            options: Object.assign(vueLoaderConfig({
              useVue: true, usePostCSS: false,
              lessPaths, lessModifyVars,
            }), {
              /**
               * important! should use postTransformNode to add $processStyle for
               * inline style prefixing.
               */
              optimizeSSR: false,
              postcss: [
                // to convert weex exclusive styles.
                require('postcss-plugin-weex')(),
                require('autoprefixer')({
                  browsers: ['> 0.1%', 'ios >= 8', 'not ie < 12']
                })
                // ,
                // require('postcss-plugin-px2rem')({
                //   // base on 750px standard.
                //   rootValue: 75,
                //   // to leave 1px alone.
                //   minPixelValue: 1.01
                // })
              ],
              compilerModules: [
                {
                  postTransformNode: el => {
                    // to convert vnode for weex components.
                    require(webPaths['falcon-vue-precompiler'])()(el)
                  }
                }
              ],
              jsLoaders: previewOptions.jsLoaders
            })
          }],
          exclude: config.excludeModuleReg
        },
        {
          test: /\.(png|jpg|gif|jpeg|bmp)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'images/[name].[ext]'
              }
            }
          ],
          exclude: config.excludeModuleReg
        }
      ]
    },
    /*
     * Add additional plugins to the compiler.
     *
     * See: http://webpack.github.io/docs/configuration.html#plugins
     */
    plugins: plugins,
    externals: [ httpRequire ]
  };
};

function httpRequire(context, request, callback, options){
  if(/^https?:/.test(request)){
    return callback(null, `"${request}"`);
  }
  return callback();
}
