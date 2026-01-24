const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin-for-multihtml');
const config = require('./config');
/**
 * Generate multiple entrys
 * @param {Array} entry 
 */

module.exports.generateHtmlWebpackPlugin = (entry, isWebBuild) => {
  let entrys = Object.keys(entry);
  // exclude vendor entry.
  entrys = entrys.filter(entry => entry !== 'vendor' && entry !== 'app');
  let htmlPlugin = entrys.map(name => {
    const options = {
      multihtmlCache: true,
      filename: name + '.html',
      template: path.resolve(__dirname, '../web/index.html'),
      isDevServer: !isWebBuild,
      chunksSortMode: 'dependency',
      inject: true,
      devScripts: config.dev.htmlOptions.devScripts,
      // chunks: [name]
      chunks: ['manifest', 'vendor','phantom-limb', name],
      isWebBuild: isWebBuild
    };
    if (isWebBuild) {
      options.minify = {
        removeComments: true,
        minifyJS: true,
        minifyCSS: true,
        collapseWhitespace: true
      };
    }
    return new HtmlWebpackPlugin(options)
  });

  const previewOptions = {
    multihtmlCache: true,
    filename: '_preview.app.html',
    template: path.resolve(__dirname, '../web/preview.html'),
    isDevServer: true,
    chunksSortMode: 'dependency',
    inject: true,
    chunks: [''],
    isWebBuild: isWebBuild
  }

  if (isWebBuild) {
    previewOptions.minify = {
      removeComments: true,
      minifyJS: true,
      minifyCSS: true,
      collapseWhitespace: true
    };
  }
  //增加一个preview的plugin
  htmlPlugin.push(new HtmlWebpackPlugin(previewOptions));
  return htmlPlugin;
}