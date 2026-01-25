'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
var commander_1 = require('commander');
var package_json_1 = require('../package.json');
var appinfo_js_1 = require('./libs/appinfo.js');
var program = new commander_1.Command();
program
  .version(package_json_1.version)
  .option('-d, --dir <type>', '\u6253\u5305\u5DE5\u7A0B\u6240\u5728\u76EE\u5F55', './')
  .option('-s, --silent', '静默无提示', false)
  .hook('preAction', function (thisCommand, actionCommand) {
    return __awaiter(void 0, void 0, void 0, function () {
      var cmdName, opts;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            cmdName = actionCommand.name();
            opts = thisCommand.opts();
            console.info(
              '\u6B63\u5728\u6267\u884C '.concat(cmdName, ' ').concat(actionCommand.args.join(' ')),
            );
            return [4 /*yield*/, (0, appinfo_js_1.init)(opts.dir)];
          case 1:
            if (!_a.sent()) {
              return [2 /*return*/];
            }
            return [2 /*return*/];
        }
      });
    });
  });
program
  .command('create')
  .description('创建小程序')
  .argument('[name]', '小程序名称')
  .action(function (name) {
    console.log('create '.concat(name));
    // actionCreate(name);
  });
program
  .command('simulator')
  .description('模拟器预览小程序')
  .option('--simpath <simulator>', '\u6A21\u62DF\u5668\u8DEF\u5F84', '')
  .option('-p, --page <page>', '\u9884\u89C8\u9875\u9762', '')
  .action(function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    // actionSimulator(...args);
  });
program
  .command('preview')
  .description('浏览器预览应用')
  .action(function () {
    // webPreview();
  });
program
  .command('build-web')
  .command('w')
  .description('构建web')
  .action(function () {
    // webBuild();
  });
program
  .command('upload')
  .description('上传小程序')
  .option('-h, --host <ip>', '\u4E3B\u673AIP', '127.0.0.1')
  .option('--port <port>', '端口号', '5556')
  .option('-p, --page <page>', '启动页面', 'index')
  .option('-n, --noPath', '是否传入安装路径', false)
  .argument('[path]', '安装路径')
  .action(function (appPath, cmd) {
    return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2 /*return*/];
      });
    });
  });
program
  .command('adb')
  .command('a')
  .description('adb命令')
  .option('-p, --page <page>', '启动页面', 'index')
  .argument('[path]', '安装路径')
  .action(function (appPath, cmd) {
    return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2 /*return*/];
      });
    });
  });
program
  .command('build')
  .command('b')
  .description('构建应用')
  .option('-c, --compress', '\u662F\u5426\u538B\u7F29\u811A\u672C', false)
  .option('-q, --qjsc', '\u662F\u5426\u4F7F\u7528qjsc\u9884\u7F16\u8BD1', false)
  .option('-p, --pack', '\u662F\u5426\u6253\u5305', false)
  .option('-m, --mock', '\u662F\u5426\u6A21\u62DF JSAPI', false)
  .option('-e, --env <var...>', '\u52A0\u5165\u73AF\u5883\u53D8\u91CF')
  .action(function (cmd) {
    return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, function (_a) {
        console.log('here', cmd);
        return [2 /*return*/];
      });
    });
  });
program.showHelpAfterError();
program.parse();
