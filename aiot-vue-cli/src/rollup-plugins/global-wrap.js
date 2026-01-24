/**
 * 对所有js做处理
 * 封装成function(Vue, Weex).把全局变量传入进去
 */ 

function globalWrap(opts = {}) {
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

module.exports = globalWrap;