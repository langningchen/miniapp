const getCommonConfig = require('./webpack.common.conf');
const webpackMerge = require('webpack-merge'); // used to merge webpack configs
const os = require('os');
const appInfo = require('../../libs/appinfo');
const path = require('path');

const webpack = require('webpack');

/**
 * Webpack Plugins
 */
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const config = require('./config');
const utils = require('./utils');
const helper = require('./helper');
const {generateHtmlWebpackPlugin, generateVendorPluginConfig}  = require('./htmlwebpackplugin');

const {getLessPaths, getLessModifyVars} = require('../../libs/common.js')

// const EXCLUDE_ENTRYS = new Set(['vendor', 'app', 'vue', 'falcon-vue-render']);



const getBuildWebpackConfig = async function () {

const appMeta = appInfo.getAppMeta();
const appMetaOptions = appMeta.options || {}

const commonConfig = await getCommonConfig(appMeta);

const styleOpts = appMetaOptions.style || {}
const lessPaths = getLessPaths(styleOpts)
const lessModifyVars = getLessModifyVars(styleOpts)

return webpackMerge(commonConfig, {
  /*
   * Options affecting the resolving of modules.
   *
   * See: http://webpack.github.io/docs/configuration.html#module
   */
  module: {
    rules: utils.styleLoaders({ sourceMap: config['web-build'].cssSourceMap, usePostCSS: true,
      lessPaths, lessModifyVars,
    })
  },
  /**
  * Developer tool to enhance debugging
  *
  * See: http://webpack.github.io/docs/configuration.html#devtool
  * See: https://github.com/webpack/docs/wiki/build-performance#sourcemaps
  */
  devtool: config['web-build'].devtool,
  /*
   * Add additional plugins to the compiler.
   *
   * See: http://webpack.github.io/docs/configuration.html#plugins
   */
  plugins: [
    /**
     * Plugin: webpack.DefinePlugin
     * Description: The DefinePlugin allows you to create global constants which can be configured at compile time. 
     *
     * See: https://webpack.js.org/plugins/define-plugin/
     */
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': config['web-build'].env
      }
    }),
    /*
     * Plugin: HtmlWebpackPlugin
     * Description: Simplifies creation of HTML files to serve your webpack bundles.
     * This is especially useful for webpack bundles that include a hash in the filename
     * which changes every compilation.
     *
     * See: https://github.com/ampedandwired/html-webpack-plugin
     */
    ...generateHtmlWebpackPlugin(commonConfig.entry, true),
    /*
     * Plugin: ScriptExtHtmlWebpackPlugin
     * Description: Enhances html-webpack-plugin functionality
     * with different deployment options for your scripts including:
     *
     * See: https://github.com/numical/script-ext-html-webpack-plugin
     */
    new ScriptExtHtmlWebpackPlugin({
      defaultAttribute: 'defer'
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: ['manifest'],
      filename: 'manifest.js',
    }),
    new webpack.DllReferencePlugin({
      context: appInfo.getAppRoot(),
      manifest: require(path.resolve(appInfo.getAppRoot(),'dist/_dll_manifest.json'))
    }),
    new UglifyJsPlugin()
  ]
});

}

module.exports = new Promise((resolve, reject) => {
  (async function () {
    buildWebpackConfig = await getBuildWebpackConfig()
    resolve(buildWebpackConfig)
  })()
})
