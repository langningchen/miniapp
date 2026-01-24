/**
 * 带颜色的打印
 */
const colors = require('colors-console');

module.exports = {
  error(...args) {
    console.log(colors('red', args.join(' ')));
  },
  warn(...args) {
    console.log(colors('yellow', args.join(' ')));
  },
  success(...args) {
    console.log(colors('green', args.join(' ')));
  }
}
