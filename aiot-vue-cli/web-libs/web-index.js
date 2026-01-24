const path = require('path')

module.exports = {
  // falcon 网页端控件渲染
  "falcon-vue-render": path.resolve(__dirname, './falcon-vue-render/packages/falcon-vue-render/dist/index.common.js'),
  // falcon 网页端 vue loader
  "falcon-vue-precompiler": path.resolve(__dirname, './falcon-vue-precompiler/src/index.js'),
  // vue
  "vue": path.resolve(__dirname, '../cli-libs/vue/dist/vue.runtime.common.js'),

  // for webpack to browse falcon-js-web.js
  "falcon-jsfm/dist": path.resolve(__dirname, '../cli-libs/falcon-jsfm/dist'),
}
