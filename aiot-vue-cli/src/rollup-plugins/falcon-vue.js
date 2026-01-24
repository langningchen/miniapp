/**
 * .vue文件插件
 */
const path = require('path')
const { stringify, parse } = require('querystring');

const pluginUtils = require('@rollup/pluginutils');
const templateCompiler = require('../../cli-libs/index.js')['falcon-template-compiler']
const transpile = require('vue-template-es2015-compiler')
const beautify = require('js-beautify').js_beautify

const helper = require('../libs/helper');
const info = require('../libs/appinfo');

const vueParse = require('../libs/parser');
const genId = require('../libs/gen-id');

const PACKAGE_NAME = 'aiot-vue-cli';

async function _transform(parts, id) {
  let scopeId = 'data-v-' + genId(path.relative(process.cwd(), id));
  const isFunctional = parts.template && parts.template.attrs && parts.template.attrs.functional
  let template = ''
  if (parts.template) {
    template = transformRequireToImport(_template(parts.template, id, isFunctional));
  }
  let styleInfo = _createStyleString(parts.styles, id, scopeId);
  let scriptString = _createScriptString(parts.script, id, scopeId, isFunctional);
  let code = `
${scriptString}
${styleInfo.importString}
${template}
const __file = '${info.pathToRootUnix(id)}';
const _scopeId = '${scopeId}';

const _exports = script;
${isFunctional ? '_exports.functional = true':''}
${parts.template?'_exports.render = render;\n_exports.staticRenderFns = staticRenderFns;\n_exports._compiled = true': ''}
_exports._scopeId = _scopeId;
_exports.themes = ${styleInfo.themesString || '{}'};
_exports.style = ${styleInfo.styleString ? styleInfo.styleString :
  (styleInfo.themesString ? "_exports.themes['_']" : "{}")};
_exports.__file = __file;

export default _exports;
`;
  return code;
}

function _createStyleString(styles, fileName, scopeId) {
  const appMeta = info.getAppMeta();
  const appMetaOptions = appMeta.options || {}
  const styleOpts = appMetaOptions.style || {}
  const themeKeys = ['_', ].concat(styleOpts.themes || [])

  if (!styles || styles.length === 0) {
    return {
      importString: '',
      styleTarget: '{}'
    }
  }

  let importString = '';
  let styleNames = [];
  styles.forEach((style, index) => {
    importString += `import style_${index} from '${path.basename(fileName)}?scopeId=${scopeId}&${PACKAGE_NAME}=styles.${index}.${style.lang ? style.lang : 'css'}'\n`;
    styleNames.push(`style_${index}`);
  });
  let themesString, styleString
  if ((styleOpts.themes || []).length == 0) {
    themesString = ''
    styleString = `Object.assign({}, ${styleNames.map(item => `${item}['_']`).join(' ,')})`
  } else {
    const joinStr = `Object.assign({}, ${styleNames.map(item => `${item}[cur]`).join(' ,')})`
    themesString = `${JSON.stringify(themeKeys)}.reduce(function(acc, cur) { acc[cur] = ${joinStr}; return acc; }, {})`
    styleString = ''
  }

  return {
    importString,
    themesString,
    styleString,
  }
}

function _createScriptString(script, fileName, scopeId, isFunctional) {
  if (!script) {
    return `const script = {}`;
  }
  return `import script from '${path.basename(fileName)}?scopeId=${scopeId}&${PACKAGE_NAME}=script.js'`;
}

function transformRequireToImport(code) {
  const imports = {};
  let strImports = '';
  code = code.replace(/require\(("(?:[^"\\]|\\.)+"|'(?:[^'\\]|\\.)+')\)/g, (_, name) => {
    // let realName = name.replace(/^[\'|\"]/, '').replace(/[\'|\"]$/, '');
    // const imgInfo = image.getImageInfo(realName);
    // let importFrom = name;
    // //线上地址,没有base64,也没有下载到本地的标记,直接使用原来的
    // if (imgInfo.isHttp && !imgInfo.needDownload) {
    //   return `"${realName}"`;
    // }

    if (!(name in imports)) {
      imports[name] = `__$_require_${name
        .replace(/[^a-z0-9]/ig, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')}__`;
      strImports += 'import ' + imports[name] + ' from ' + name + '\n';
    }
    return imports[name];
  });
  // console.log(strImports + code);
  return strImports + code;
}

function _template(template, id, isFunctional) {
  let content = template.content;
  let compiled = templateCompiler.compile(content);
  let $render = compiled['@render'] ? `"@render":${toFunction(compiled['@render'])},` : '';
  function toFunction(code) {
    return 'function ('+(isFunctional?'_h,_vm':'')+'){\n' + beautify(code, { indent_size: 2 }) + '}'
  }
  let code = `
let render = ${toFunction(compiled.render)};
${$render}
let staticRenderFns=[${compiled.staticRenderFns.map(toFunction).join(',')}];
render._withStripped = true;
  `;

  const finalTranspileOptions = {
    transforms: {
      stripWithFunctional: isFunctional
    }
  }
  return transpile(code, finalTranspileOptions);
}

const GET_QUERY = /\.vue(\.[a-z]+?)?\?(.+)$/i;

function parseVueQueryString(id) {
  const match = GET_QUERY.exec(id);
  if (!match) {
    return null;
  }

  const query = parse(match[2]);
  if (PACKAGE_NAME in query) {
    const data = (Array.isArray(query[PACKAGE_NAME])
      ? query[PACKAGE_NAME][0]
      : query[PACKAGE_NAME]);
    const [type, index, lang] = data.split('.');
    return (lang
      ? { type, lang, index: parseInt(index) } // styles.0.css
      : { type, lang: index }); // script.js
  }
}


function VueTemplate() {
  var filter = pluginUtils.createFilter(['**/*.vue']);
  const COMPILE_CACHE = new Map();
  return {
    name: 'vue',
    resolveId(id, importer) {
      const meta = parseVueQueryString(id);
      if (!meta) {
        //不是一个vue文件
        return;
      }
      let newId = path.resolve(path.dirname(importer), id);
      let parts = COMPILE_CACHE.get(importer);
      if (parts) {
        let src;
        if (meta.type == 'styles') {
          src = parts.styles[meta.index].src;
        } else if (meta.type == 'script') {
          src = parts.src;
        }
        if (src) {
          // console.log('src:', src);
          if (src.startsWith('.')) {
            newId = path.resolve(path.dirname(importer), src);
          } else if (src.startsWith('@')) {
            newId = path.resolve(path.dirname(importer), src.replace('@', path.resolve(info.getAppRoot(), 'src')));
          } else {
            newId = require.resolve(src, {
              paths: [path.dirname(importer)]
            });
          }
        }

        // console.log(`resolveId from:${id} to${newId}`);
        return newId;
      } else {  //永远不会为空
        console.error('error! parts in cache is empty!!!!!!!');
      }
    },
    load(id) {
      const meta = parseVueQueryString(id);
      let importer = id.split('?')[0];
      let parts = COMPILE_CACHE.get(importer);
      if (!meta || !parts) {
        return null;
      }

      let code;
      if (meta.type == 'styles') {
        let style = parts.styles[meta.index];
        if (style.src) {
          let filePath = path.resolve(path.dirname(id), style.src);
          code = helper.getContent(filePath);
        } else {
          code = parts.styles[meta.index].content;
        }
      } else {
        if (parts.script) {
          if (parts.script.src) {
            let filePath = path.resolve(path.dirname(id), parts.script.src);
            code = helper.getContent(filePath);
          } else {
            code = parts.script.content;
          }
        }

        if (!code) {
          code = `export default {};`;
        }
      }
      return transformRequireToImport(code);
    },
    async transform(code, id) {
      if (!filter(id)) {
        return;
      }

      let parts = vueParse(code, id, false);
      COMPILE_CACHE.set(id, parts);

      let compiled = await _transform(parts, id);
      // console.log('transform:', id, 'compiled:', compiled);
      return compiled;
    }
  };
}

module.exports = VueTemplate;
