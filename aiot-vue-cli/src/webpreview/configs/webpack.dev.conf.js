const getCommonConfig = require('./webpack.common.conf');
const webpackMerge = require('webpack-merge'); // used to merge webpack configs
// tools
const chalk = require('chalk');
const path = require('path');
const webpack = require('webpack');
const ip = require('ip').address();

/**
 * Webpack Plugins
 */
const HtmlWebpackPlugin = require('html-webpack-plugin-for-multihtml');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const portfinder = require('portfinder')

const config = require('./config');
const utils = require('./utils');
const helper = require('./helper');
const {generateHtmlWebpackPlugin, generateVendorPluginConfig} = require('./htmlwebpackplugin');
const appInfo = require('../../libs/appinfo');

const openPage = config.dev.openPage + "?";

// hotreload server for playground App
const wsServer = require('./hotreload');

const {getLessPaths, getLessModifyVars} = require('../../libs/common.js')

let wsTempServer = null

const getDevWebpackConfig = async function() {

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
    rules: utils.styleLoaders({ sourceMap: config.dev.cssSourceMap, usePostCSS: true,
      lessPaths, lessModifyVars,
    })
  },
  /**
  * Developer tool to enhance debugging
  *
  * See: http://webpack.github.io/docs/configuration.html#devtool
  * See: https://github.com/webpack/docs/wiki/build-performance#sourcemaps
  */
  devtool: config.dev.devtool,
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
        'NODE_ENV': config.dev.env
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
    ...generateHtmlWebpackPlugin(commonConfig.entry, false),
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
      manifest: require(path.resolve(appInfo.getAppRoot(),'.temp/_dll_manifest.json'))
    }),
  ],
  /**
   * Webpack Development Server configuration
   * Description: The webpack-dev-server is a little node.js Express server.
   * The server emits information about the compilation state to the client,
   * which reacts to those events.
   *
   * See: https://webpack.github.io/docs/webpack-dev-server.html
   */
  devServer: {
    clientLogLevel: 'warning',
    compress: false,
    contentBase: config.dev.contentBase,
    host: config.dev.host,
    port: config.dev.port,
    historyApiFallback: config.dev.historyApiFallback,
    public: config.dev.public,
    index: '_preview.app.html',
    open: config.dev.open,
    watchContentBase: config.dev.watchContentBase,
    overlay: config.dev.errorOverlay
      ? { warnings: false, errors: true }
      : false,
    proxy: config.dev.proxyTable,
    quiet: true, // necessary for FriendlyErrorsPlugin
    openPage: encodeURI(openPage),
    watchOptions: config.dev.watchOptions
  }
});

}

module.exports = new Promise((resolve, reject) => {
(async function() {

  const devWebpackConfig = await getDevWebpackConfig()
  portfinder.basePort = process.env.PORT || config.dev.port
  portfinder.getPort((err, port) => {
    if (err) {
      reject(err)
    } else {
      // publish the new Port, necessary for e2e tests
      process.env.PORT = port
      // add port to devServer config
      devWebpackConfig.devServer.port = port
      devWebpackConfig.devServer.public = `${ip}:${port}`
      devWebpackConfig.devServer.openPage += `&wsport=${port+1}`
      // Add FriendlyErrorsPlugin
      devWebpackConfig.plugins.push(new FriendlyErrorsPlugin({
        compilationSuccessInfo: {
          messages: [
            `Your application is running here: ${chalk.yellow(`http://${devWebpackConfig.devServer.host}:${port}`)}.`
          ],
        },
        onErrors: config.dev.notifyOnErrors
        ? utils.createNotifierCallback()
        : undefined
      }))
      wsTempServer = new wsServer(port+1)
      resolve(devWebpackConfig)
    }
  })

})()

});
