/**
 * 组件中有import 'vue'时,对vue进行替换.
 * 替换成运行时WeexInstance中的Vue
 */

function vueReplacer(opts = {}) {
  return {
    name: 'vue-replace',
    resolveId(id, importer) {
      if (id === 'vue') {
        console.log('resolveId2:', id);
        return id;
      }
    },
    async load(id) {
      if (id === 'vue') {
        console.log('vue', id);
        return `
let Vue = {};
export default {};
        `;
      }
    },
    async transform(code, id) {
      // console.log('transform:', id);
    }
  };
}

module.exports = vueReplacer;