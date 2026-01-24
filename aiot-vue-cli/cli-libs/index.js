const path = require('path')

module.exports = {
  "falcon-styler": require(path.resolve(__dirname, './falcon-styler')),
  "falcon-template-compiler": require(path.resolve(__dirname, './vue/packages/weex-template-compiler')),
  "vue-template-compiler": require('@vue/compiler-sfc'),
  "aiot-qjsc-tool/libs/qjsc": require(path.resolve(__dirname, './aiot-qjsc-tool/libs/qjsc')),
}