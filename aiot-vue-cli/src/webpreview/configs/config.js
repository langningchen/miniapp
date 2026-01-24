const path = require('path');
const appInfo = require('../../libs/appinfo');
const helper = require('./helper');
const ip = require('ip').address();
const ROOT = helper.projectRoot();
const webPaths = require('../../../web-libs/web-index.js')

const config = {
  root: ROOT,
  // webpack-dev-server
  pluginConfigPath: 'plugins/plugins.json',
  pluginFilePath: 'plugins/plugins.js',
  // router
  // common
  sourceDir: 'src',
  templateDir: '.temp',
  entryFilePath: 'bootstrap.web.js',
  // Module exclude from compile process
  excludeModuleReg: /node_modules(?!(\/|\\).*(weex|falcon).*)/,
  appJson: 'app.json',
  // Filter for entry files
  // see: https://www.npmjs.com/package/glob#glob-primer
  entryFilter: '**/*.vue',
  // Options for the filter
  // see: https://www.npmjs.com/package/glob#options
  entryFilterOptions: {},
  dev: {
    // Various Dev Server settings
    contentBase: [
      path.resolve(__dirname, '../'),
      path.resolve(webPaths['falcon-jsfm/dist']),
      path.resolve(appInfo.getAppRoot(), '.temp')
    ],
    host: ip,
    port: 8081,
    historyApiFallback: true,
    open: true,
    watchContentBase: true,
    openPage: '',
    watchOptions: {
      ignored: /node_modules(?!(\/|\\).*(weex|falcon).*)/,
      aggregateTimeout: 300,
      poll: false
    },
        /**
     * Source Maps
     */
    // https://webpack.js.org/configuration/devtool/#development
    devtool: 'source-map',
    env: JSON.stringify('development'),
    // If you have problems debugging vue-files in devtools,
    // set this to false - it *may* help
    // https://vue-loader.vuejs.org/en/options.html#cachebusting
    cacheBusting: true,
    // CSS Sourcemaps off by default because relative paths are "buggy"
    // with this option, according to the CSS-Loader README
    // (https://github.com/webpack/css-loader#sourcemaps)
    // In our experience, they generally work as expected,
    // just be aware of this issue when enabling this option.
    cssSourceMap: false,
    proxyTable: {},
    autoOpenBrowser: false,
    errorOverlay: true,
    notifyOnErrors: true,
    htmlOptions: {
      devScripts: `
        <script>
          window.addEventListener('load', function () {
            var is_touch_device = function () {
              return 'ontouchstart' in window // works on most browsers
                  || 'onmsgesturechange' in window; // works on ie10
            };
            if(!is_touch_device()) {
              if (window.parent === window) { // not in iframe.
                window.phantomLimb.stop()
              }
            }
          })
        </script>
        `
    },
  },
  "web-build": {
    env: JSON.stringify('production'),
    /**
     * Source Maps
     */
    productionSourceMap: false,
    // https://webpack.js.org/configuration/devtool/#production
    devtool: 'none',
    cssSourceMap: false
  },
  nodeConfiguration: {
    global: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
    setImmediate: false,
    clearImmediate: false,
    // see: https://github.com/webpack/node-libs-browser
    assert: false,
    buffer: false,
    child_process: false,
    cluster: false,
    console: false,
    constants: false,
    crypto: false,
    dgram: false,
    dns: false,
    domain: false,
    events: false,
    fs: false,
    http: false,
    https: false,
    module: false,
    net: false,
    os: false,
    path: false,
    process: false,
    punycode: false,
    querystring: false,
    readline: false,
    repl: false,
    stream: false,
    string_decoder: false,
    sys: false,
    timers: false,
    tls: false,
    tty: false,
    url: false,
    util: false,
    vm: false,
    zlib: false
  }
}
module.exports = config;
