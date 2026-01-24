/**
 * falcon内置模块
 * 这个模块要放在rollup-plugin的最后一个位置,用于处理没有被前面处理的模块(内置模块)
 * 1.解决 import http from '$jsapi/http'方式引入jsapi
 * 2.解决未被任何插件处理的import组件
 */
const FALCON_MODULE_REG = /^\$jsapi\/(.*)/;
const FALCON_MODULE_NAME_REG = /^[0-9a-zA-Z_]{1,}$/;
const log = require('../libs/log');
const share = require('../libs/share');
const colors = require('colors-console');
const appInfo = require('../libs/appinfo');
const chalk = require('chalk')

const internalModules = new Set();

const splitRE = /\r?\n/
function pad(source, n = 2) {
  const lines = source.split(splitRE);
  return lines.map((l) => ` `.repeat(n) + l).join(`\n`);
}
function cleanStack(stack) {
  return stack
      .split(/\n/g)
      .filter((l) => /^\s*at/.test(l))
      .join('\n');
}

function buildErrorMessage(err, args = [], includeStack = true) {
  if (err.plugin)
      args.push(`  Plugin: ${chalk.magenta(err.plugin)}`);
  if (err.id)
      args.push(`  File: ${chalk.cyan(err.id)}`);
  if (err.frame)
      args.push(chalk.yellow(pad(err.frame)));
  if (includeStack && err.stack)
      args.push(pad(cleanStack(err.stack)));
  return args.join('\n');
}

function falconModule(opts = {}) {
  return {
    name: 'falcon-module',
    resolveId(id, importer) {
      if (FALCON_MODULE_REG.test(id)) {
        return id;
      } else {
        internalModules.add(id);
        return {
          id: id,
          external: true
        }
      }
    },
    load(id) {
      const matchs = id.match(FALCON_MODULE_REG);
      if (matchs && matchs[1]) {
        const moduleName = matchs[1];
        if (FALCON_MODULE_NAME_REG.test(moduleName)) {
          return `export default $falcon.jsapi['${matchs[1]}']`;
        } else {
          console.error(colors('red', `非法的模块名: ${moduleName}`));
          return `export default undefined`;
        }
      }
    },
    buildEnd(error) {
      const packageInfo = appInfo.getAppPackageInfo()
      if (error) {
        try {
          const msg = buildErrorMessage(error, [chalk.red(`构建失败: ${error.message}`)])
          console.error(msg)
        } catch(_) {
          // buildErrorMessage error, always print error
          console.error(error)
        }

      }
      share.internalModules = Array.from(internalModules)
      const deps = packageInfo.dependencies || {}
      const requiredPkgs = []
      const optionalPkgs = []
      for (let pkg of internalModules) {
        if (pkg in deps) {
          requiredPkgs.push(pkg)
        } else {
          optionalPkgs.push(pkg)
        }
      }
      if (requiredPkgs.length > 0) {
        const err = `以下模块必须安装${[...requiredPkgs].join(',')}\n可运行 cnpm install 安装\n`
        log.error(err)
        throw new Error(err)

      }
      if (optionalPkgs.length != 0) {
        log.warn(`未找到以下模块,可能会导致应用运行时异常(如模块为原生模块请忽略):\n${[...optionalPkgs].join(',')}\n`);
        // console.log(colors('green', `请确认已引用的内置模块:${[...optionalPkgs].join(',')}`));
      }
    }
  };
}

module.exports = falconModule;
