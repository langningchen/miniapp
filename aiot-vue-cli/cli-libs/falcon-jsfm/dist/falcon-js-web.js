/**
 * 让vue忽略检查的组件
 * 只支持框架公共的内置组件
 * TODO: 特定项目如果有特殊的组件,需要支持在项目中配置预定义组件
 */

const FALCON_IGNORE_ELEMENTS = ['modal', 'seekbar'];

function applyIgnoreElements(Vue) {
  const ignoreElements = Vue.config.ignoredElements || [];
  Vue.config.ignoredElements = [...ignoreElements, ...FALCON_IGNORE_ELEMENTS];
}

/**
 * web-driver
 * 重写与native不一样的方法
 */
let _id = 0;
function getPageId() {
  return ++_id;
}

class PageManager {
  constructor() {
    this.pageStack = [];
  }

  front(pageName) {
    const index = this.pageStack.findIndex((name) => name === pageName);
    if (index === -1) {
      this.pageStack.push(pageName);
    } else {
      const current = this.pageStack.splice(index, 1)[0];
      this.pageStack.push(current);
    }
  }
  top() {
    return this.pageStack[this.pageStack.length - 1];
  }
  pop() {
    return this.pageStack.pop();
  }

  remove(pageName) {
    const index = this.pageStack.findIndex((name) => name === pageName);
    if (index !== -1) {
      return this.pageStack.splice(index, 1);
    }
    return null;
  }
  clear() {
    this.pageStack = [];
  }
}

const pageMgr = new PageManager();

const driver = {
  // mapping native $falcon.loadPage
  _web_boot_page: function (PageClass, Vue, subWindow) {
    if (PageClass.__esModule === true) {
      PageClass = PageClass.default;
    }

    // 忽略已预定义的内置标签
    applyIgnoreElements(Vue);

    const pageName = subWindow.$pageName;
    const wxInstance = subWindow.weex;
    wxInstance.requireModule('meta').setViewport({
      width: subWindow.$falcon.env.deviceWidth,
      height: subWindow.$falcon.env.deviceHeight
    });
    const options = subWindow.$falcon_pageOptions || {};
    const instanceId = getPageId();
    this.__loadPage(PageClass, pageName, wxInstance, instanceId, Vue, options);

    // web上直接触发一次onShow生命周期
    this._performPageLifeCycle(instanceId, 'onShow', options, 'show');

    subWindow.$falcon_page = this._pageMap.get(instanceId);
  },
  navTo: function (page, options) {
    if (page.indexOf('://') !== -1) {
      console.error('unsupport nav to app on web,please try on device!');
      return;
    }
    const main = document.querySelector('#main');
    const iframes = main.querySelectorAll('iframe');
    let find = false;
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      const pageName = iframe.getAttribute('id');
      const falconPage = iframe.contentWindow.$falcon_page;
      const pageId = (falconPage && falconPage.$pageId) || '';
      if (pageName === page) {
        find = true;
        iframe.style = '';
        if (!iframe.$falcon_current) {
          $falcon.showPage(pageId);
          $falcon.newPageOptions(pageId, options);
        }

        iframe.$falcon_current = true;
      } else {
        iframe.style = 'display:none';
        if (iframe.$falcon_current) {
          $falcon.hidePage(pageId);
        }
        iframe.$falcon_current = false;
      }
    }
    if (!find && page) {
      const iframe = document.createElement('iframe');
      // 监听iframe的ready状态,把当前页面的style注入到子页面中
      // 解决在app中注册的组件的样式在子页面中不存在的问题
      iframe.onload = () => {
        const styles = document.querySelectorAll('style');
        styles.forEach((style) => {
          const subDocument = iframe.contentWindow.document;
          const styNode = subDocument.createElement('style');
          styNode.type = 'text/css';
          styNode.innerHTML = style.innerHTML;
          subDocument.querySelector('head').appendChild(styNode);
        });
      };

      iframe.src = page + '.html';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('id', page);
      main.appendChild(iframe);
      iframe.$falcon_current = true;
      iframe.contentWindow.$falcon = this;
      iframe.contentWindow.$falcon_pageOptions = options;
      iframe.contentWindow.$pageName = page;
      // 监听返回键关闭当前页面
      iframe.contentWindow.addEventListener('keyup', (evt) => {
        if (evt.key === 'Escape') {
          const topPageName = pageMgr.top();
          $falcon.closePageByName(topPageName);
        }
      });
    }
    if (page) {
      window.location.hash = 'page=' + page;
    }

    pageMgr.front(page);
  },
  closeApp(appId) {
    $falcon.hideApp();
    $falcon.destroyApp();

    const main = document.querySelector('#main');
    main.innerHTML = '';
    pageMgr.clear();
  },

  /**
   * 根据页面名称关闭页面
   * @param {String} pageName 页面名称
   */
  closePageByName(pageName) {
    const main = document.querySelector('#main');
    const iframe = document.querySelector('#' + pageName);
    const isTop = pageMgr.top() === pageName;
    if (iframe) {
      const page = iframe.contentWindow.$falcon_page;
      const pageId = page.$pageId;
      if (isTop) {
        $falcon.hidePage(pageId);
      }
      $falcon.unloadPage(pageId);
      main.removeChild(iframe);
      pageMgr.remove(pageName);

      if (isTop) {
        const nextPageName = pageMgr.top();
        const nextIframe = document.querySelector('#' + nextPageName);
        if (nextIframe) {
          nextIframe.style = '';
          const nextPage = nextIframe.contentWindow.$falcon_page;
          $falcon.showPage(nextPage);
          window.location.hash = 'page=' + nextPageName;
        }
      }
    } else {
      console.warn(`cant't find page:${pageName} on close`);
    }
  },

  /**
   * 根据页面id关闭页面
   * @param {String} instanceId 页面id
   */
  closePageById(instanceId) {
    const page = this._pageMap.get(instanceId);
    this.closePageByName(page.$pageName);
  },

  /**
   * 加载web侧的页面模块
   * @param {*} page 页面
   * @param {*} wxInstance wx实例
   */
  _apply_page_mode(page, wxInstance) {
    ['dom', 'animation'].forEach((mod) => {
      const modName = `$${mod}`;
      if (page[modName]) {
        console.warn(`module conflict:${modName}`);
      } else {
        page[modName] = wxInstance.requireModule(mod);
      }
    });
  }
};

/**
 * 全局静态配置信息
 */

/**
 * 默认schema
 */
const SCHEMA = 'falcon';

/**
 * 工具集合,杂货铺
 */

/**
 * URI解析的正则表达式
 */
const REG_URI = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
const REG_GROUPS = ['url', 'scheme', 'slash', 'host', 'port', 'path', 'query', 'hash'];

/**
 * query和hash解析的正则表达式
 */
const QUERY_REG = /([^=&\s]+)[=\s]*([^&\s]*)/g;

var Util = {
  getDlogFun(tag) {
    return function () { };
  },

  /**
   * 解析query格式的字符串为Object
   * 接收字符串格式示例:a=1&b=2
   * @param {String} query query字符串
   */
  parseQuery(query) {
    const obj = {};
    while (QUERY_REG.exec(query)) {
      obj[RegExp.$1] = RegExp.$2;
    }
    return obj;
  },

  parseUri(uri) {
    const matches = REG_URI.exec(uri);
    const result = {};
    REG_GROUPS.forEach((key, index) => {
      const match = matches[index];
      if (match) {
        if (key === 'query' || key === 'hash') {
          result[key] = this.parseQuery(match);
        } else {
          result[key] = match;
        }
      }
    });
    return result
  }
};

/**
 * 全局事件模块
 * jsapi模块下用户的事件,全都通过全局事件的方式发送
 * 注意:这里是全局事件,和组件事件不同.组件事件参考vue的事件系统
 */
class FalconEvent {
  constructor() {
    this.eventMap = {};
    this._uniqueId = 0;
  }

  /**
   * 注册事件名
   * @param {String} name 事件名
   * @param {Function} callback 回调方法
   * @returns 事件id
   */
  register(name, callback) {
    if (!this.eventMap[name]) {
      this.eventMap[name] = [];
    }
    const id = ++this._uniqueId;
    this.eventMap[name].push({
      callback,
      id
    });
    return id;
  }

  /**
   * 注销事件监听
   * @param {String}} name 事件名
   * @param {Function|Integer} callback 回调方法或事件id
   */
  unRegister(name, callback) {
    const evtList = this.eventMap[name];
    if (evtList) {
      if (callback) {
        const index = evtList.findIndex(item => item.callback === callback || item.id === callback);
        if (index !== -1) {
          evtList.splice(index, 1);
        }

        if (evtList.length === 0) {
          delete this.eventMap[name];
        }
      } else {
        delete this.eventMap[name];
      }
    }
  }

  /**
   * 触发事件
   * @param {String} name 事件名
   * @param {Object} options 事件参数
   */
  trigger(name, options) {
    let listeners = this.eventMap[name];
    if (listeners && listeners.length !== 0) {
      const data = {
        type: name,
        timestamp: Date.now(),
        data: options || {}
      };

      // 拷贝一份,防止事件回调中用户注销事件,导致部分监听遍历不到
      listeners = listeners.slice();
      listeners.forEach(l => {
        l && l.callback && l.callback(data);
      });
    }
  }

  /**
   * 注册事件监听快捷方式
   * @param {String} name 事件名
   * @param {Function} callback 回调方法
   */
  on(name, callback) {
    return this.register(name, callback);
  }

  /**
   * 注销事件监听快捷方式
   * @param {*} name 事件名
   * @param {*} callback 回调方法
   */
  off(name, callback) {
    this.unRegister(name, callback);
  }
}

/**
 * 应用基类
 */

const dog$1 = Util.getDlogFun('App');

class App extends FalconEvent {
  /**
   * 应用生命周期:应用启动
   * @param {Object} options 启动参数
   */
  onLaunch(options) {
    this.launchOptions = options;
    dog$1(`onLaunch:${JSON.stringify(options)}`);
  }

  /**
   * 应用生命周期,应用启动或者从后台切换到前台时调用
   */
  onShow() {
    dog$1(`onShow`);
  }

  /**
   * 应用生命周期:应用关闭或者从前台到后台,
   */
  onHide() {
    dog$1(`onHide`);
  }

  /**
   * 应用生命周期:应用销毁
   */
  onDestroy() {
    dog$1(`onDestroy`);
  }

  /**
   * js异常回调(暂不支持)
   * @param {Object} error 异常信息
   */
  onError(error) {
    dog$1(`onError:${error.message},${error.stack}`);
  }

  /**
   * 关闭当前应用
   */
  finish() {
    this.$falcon.closeApp();
  }

  /**
   * 设置应用的viewPort
   * 如果设置了应用的viewPort,容器会根据viewPort和实际容器物理尺寸进行缩放
   * @param {Integer} viewPort 应用的viewPort
   */
  setViewPort(viewPort) {
    this.viewPort = viewPort;
  }
}

/**
 * 页面基类
 */

const dog = Util.getDlogFun('Page');

class Page extends FalconEvent {
  /**
   * 设置页面根组件
   * 在构造函数或者onLoad中设置.否则会导致页面显示不出来
   */
  setRootComponent(Component) {
    if (this._component) {
      // 根组件不允许重复设置
      throw new Error('root component has set!');
    }
    this._component = Component;
  }

  /**
   * 页面生命周期:首次启动
   * @param {Object} options 页面启动参数
   */
  onLoad(options) {
    this.loadOptions = options;
    dog(`onLoad:${JSON.stringify(options)},instance:${this.$pageId}`);
  }

  /**
   * 页面生命周期:重新启动
   * @param {Object}} options 重新启动参数
   */
  onNewOptions(options) {
    this.newOptions = options;
    dog(`onNewOptions:${JSON.stringify(options)},instance:${this.$pageId}`);
  }

  /**
   * 页面生命周期:页面进入前台
   */
  onShow() {
    dog(`onShow,instance:${this.$pageId}`);
  }

  /**
   * 页面生命周期:页面进入后台
   */
  onHide() {
    dog(`onHide,instance:${this.$pageId}`);
  }

  /**
   * 页面生命周期:页面卸载
   */
  onUnload() {
    dog(`onUnload,instance:${this.$pageId}`);
  }

  /**
   * 关闭当前页面
   */
  finish() {
    this.$falcon.closePageById(this.$pageId);
  }
}

/**
 * jsapi模块类
 * 将.分割的接口转成模块,支持事件,方法调用
 */

class FalconModule extends FalconEvent {
  constructor(name) {
    super();
    // 模块名
    this.name = name;
  }
}

/**
 * 接口类
 */

const SCHEMA_STARTS = `${SCHEMA}://`;

/**
 * 对jsapi方法进行promise包装
 * @param {Function} fn 需要被promise包装的jsapi
 */
function _promisefy(fn) {
  return function (options, callback) {
    return new Promise(function (resolve) {
      fn(options, function (result) {
        callback && callback(result);
        resolve(result);
      });
    });
  }
}
/**
 * 全局接口信息
 * 内部(全局通用)接口一般直接挂载到$falcon下,如:
 * $falcon.navTo("page1")
 * 扩展接口挂到$falcon.jsapi对象上,如:
 * $falcon.jsapi.xxx();
 */

const JSAPI = {
  /**
   * 跳转到target指定的页面
   * 支持指定页面名称方式:navigateTo('pageName')
   * 或schema方式:navigateTo('miniapp://appid[dirname]/page1?&param1=xxx&param2=xxx')
   * @param {String} target 跳转目标
   */
  navTo(target, options, ...params) {
    if (!target) {
      console.error('$falcon.navTo(target) error, params target is null or empty!');
      return;
    }
    if (target.startsWith(SCHEMA_STARTS)) {
      // schema方式跳转,传给native
      const uri = Util.parseUri(target);
      let query = uri.query || {};
      if (options) {
        query = Object.assign(query, options);
      }
      const args = [uri.host, uri.path, query];
      this.__NAVIGATOR.navToApp.apply(this.__NAVIGATOR, args.concat(params));
    } else {
      // 应用内通过指定page名称跳转
      const args = [target, options];
      this.__NAVIGATOR.navToPage.apply(this.__NAVIGATOR, args.concat(params));
    }
  },

  /**
   * 关闭应用
   * 如果不带参数,则关闭当前应用
   * 否则关闭对应的appId的应用
   * @param {String} appId 应用id
   */
  closeApp(appId) {
    this.__NAVIGATOR.closeApp(appId);
  },

  /**
   * 根据页面名称关闭页面
   * @param {String} page 页面名称
   */
  closePageByName(page) {
    this.__NAVIGATOR.closePageByName(page);
  },

  /**
   * 根据页面id关闭页面
   * @param {String} instanceId 页面id
   */
  closePageById(instanceId) {
    this.__NAVIGATOR.closePageById(instanceId);
  },

  /**
   * 把接口都绑定到指定对象上,未来权限管理之类用
   * @param {Object} obj 需要被绑定的对象
   */
  __applyTo(obj) {
    for (const key in JSAPI) {
      if (key !== '__applyTo' && key !== '__modular') {
        obj[key] = JSAPI[key];
      }
    }
  },

  /**
   * 模块化jsapi
   * 将.分割的接口拆分成模块,如obj["a.b"]拆分成obj.a.b
   * 并且将所有以点分割的item都模块化
   * @param {Object} obj 需要模块化的对象
   * @returns jsapi映射的模块列表
   */
  __modular(obj) {
    const modules = [];
    obj && Object.keys(obj).forEach((apiName) => {
      const fn = obj[apiName];
      if (typeof fn === 'function') {
        const sep = apiName.split('.');
        if (sep.length > 1) {
          let current = obj;
          let currentModuleName = '';
          for (let i = 0; i < sep.length; i++) {
            const key = sep[i];
            if (i !== sep.length - 1) {
              if (current[key] === undefined) {
                const module = new FalconModule(currentModuleName + key);
                current[key] = module;
                modules.push(module);
              } else {
                // 模块名冲突,直接抛异常
                if (!(current[key] instanceof FalconModule)) {
                  throw Error(`conflict moduleName: ${key}, api:${apiName}`);
                }
              }
              current = current[sep[i]];
              currentModuleName = key + '.';
            } else {
              if (current[key] === undefined) {
                current[key] = _promisefy(fn);
              } else {
                // 方法名冲突
                throw new Error(`conflict jsapi:${apiName}`);
              }
            }
          }
        }
      }
    });
    return modules;
  }
};

/**
 * vue插件
 * 1.修复weex中对document和weex实例访问错误问题
 * 2.增加组件中快捷访问$app,$page属性
 * 原因:
 * 组件对_ctor会有缓存,如果不同的页面引用了同一个组件,会导致后续的组件访问扩展属性永远都是第一个扩展时设置上去的值
 * 所以要修改,否则实例访问会错误
 */
function falconPluginFactory (falcon, app, page, wxInstance, instanceId) {
  let ctors = [];
  return {
    install(Vue) {
      Vue.prototype.$instanceId = instanceId;
      Vue.prototype.$document = wxInstance.weex ? wxInstance.weex.document : wxInstance.document;
      Vue.prototype.$requireWeexModule = wxInstance.requireModule;
      Vue.prototype.$falcon = falcon;
      Vue.prototype.$app = app;
      Vue.prototype.$page = page;

      Vue.mixin({
        mounted() {
          // root component (vm)
          if (this.$root === this) {
            const doc = this.$document;
            if (doc && doc.taskCenter) {
              try {
                // Send "createFinish" signal to native.
                doc.taskCenter.send('dom', { action: 'createFinish' }, []);
              } catch (e) {
                console.log(e.message, e.stack);
              }
            }
          }
        },

        beforeDestroy() {
          if (this.constructor.extendOptions) {
            ctors.push(this.constructor.extendOptions._Ctor);
          }

          // 组件已注册,但是没有被使用过,需要再这里获取
          if (this.constructor.options && this.constructor.options.components) {
            const components = this.constructor.options.components;
            if (components) {
              for (const p in components) {
                const ctor = components[p]._Ctor;
                if (ctor) {
                  ctors.push(ctor);
                }
              }
            }
          }

          // 根节点需要从this.$options中获取组件配置,如果已经注册,但是还没使用过(未实例化)的组件,需要再这里获取
          if (this.$root === this) {
            if (this.$options.components) {
              const comps = this.$options.components;
              for (const p in comps) {
                const ctor = comps[p]._Ctor;
                if (ctor) {
                  ctors.push(ctor);
                }
              }
            }
          }
        },
        destroyed() {
          // 根节点被销毁时,清理所有ctor
          if (this === this.$root) {
            const cid = this.$instanceId;
            ctors.forEach((ctor) => {
              // console.log('aabbcc ctor:', Object.keys(ctor));
              delete ctor[cid];
            });
            ctors = null;

            // 通过Vue.component()方法注册的组件,但是没有被使用过,需要在这里销毁.不写到beforeDestroy中,因为
            if (this.constructor.options && this.constructor.options.components) {
              const components = this.constructor.options.components;
              for (const p in components) {
                if (typeof components[p].extendOptions === 'object') {
                  const ctor = components[p].extendOptions._Ctor;
                  if (ctor) {
                    delete ctor[cid];
                  }
                }
              }
            }
          }
        }
      });

      /**
       * @deprecated Just instance variable `weex.config`
       * Get instance config.
       * @return {object}
       */
      Vue.prototype.$getConfig = function () {
        const instance = this.$page._instance;
        if (instance.app instanceof Vue) {
          return instance.config
        }
      };
    }
  }
}

/**
 * falcon,引用的全局变量
 */

/**
 * 从appContext上拷贝属性到$falcon的属性列表
 */
const COPYS_FROM_APPCONTEXT_TO_FALCON = [
  '__NAVIGATOR', '__JSAPI'
];

// /**
//  * 预加载的页面模块
//  */
// const PRE_LOAD_PAGE_MODULE = [
//   'dom', 'animation'
// ];

/**
 * 事件正则表达式
 */
const EVENT_REGEXP = /^(.+)\.([^.]+)$/;
/**
 * 每个App会实例化一个falcon对象
 */
class Falcon extends FalconEvent {
  /**
   * 初始化当前的context
   * 参数为框架全局的GlobalContext下的GlobalObject和当前context的global
   * 在当前的context下
   * 1.创建$falcon全局对象
   */
  static initAppContext(gGlobal, instanceGlobal) {
    // eslint-disable-next-line no-undef
    const _falcon = new $_Falcon();
    instanceGlobal.$falcon = _falcon;
    _falcon.App = App;
    _falcon.Page = Page;

    COPYS_FROM_APPCONTEXT_TO_FALCON.forEach((prop) => {
      _falcon[prop] = instanceGlobal[prop];
    });

    _falcon.jsapi = _falcon['__JSAPI'];

    // 全局环境信息,包括系统版本,窗口尺寸等信息
    _falcon.env = instanceGlobal.WXEnvironment;
    _falcon.$_appInfo = instanceGlobal.$_appInfo;

    // 需要代理的接口通过这个方式挂载到$falcon上
    JSAPI.__applyTo(_falcon);
    try {
      const modules = JSAPI.__modular(_falcon.jsapi);
      _falcon._registerModule(modules);
    } catch (e) {
      console.log(e.message, e.stack);
    }
  }

  /**
   * 应用启动期间使用自定义的page类作为所有页面的基类
   * @param {Class extends $falcon.Page} BasePageClass 新的页面基类
   */
  useDefaultBasePageClass(BasePageClass) {
    if (BasePageClass.prototype instanceof Page) {
      this.Page = BasePageClass;
    } else {
      throw new Error('DefauBasePageClass must extend from $falcon.App');
    }
  }

  constructor() {
    super();
    this.util = Util;
    this._pageMap = new Map();

    this._modules = new Map();
  }

  /**
   * 注册模块
   * @param {FalconModule|Array<FalconModule>} module 模块或模块数组
   */
  _registerModule(modules) {
    if (!Array.isArray(modules)) {
      modules = [modules];
    }
    modules.forEach((module) => {
      this._modules.set(module.name, module);
    });
  }

  /* ====== 事件模块 start ===== */

  _dispatchModuleEvent(name, options) {
    if (name.indexOf('.') !== -1) {
      const matchs = name.match(EVENT_REGEXP);
      if (matchs && matchs[1] && matchs[2]) {
        const moduleName = matchs[1];
        const eventName = matchs[2];
        if (this._modules.has(moduleName)) {
          const module = this._modules.get(moduleName);
          if (module) {
            module.trigger(eventName, options);
          }
        }
      }
    }
  }

  /**
   * 触发事件
   * @param {String} name 事件名
   */
  trigger(name, options) {
    // 触发通过$falcon.on监听的事件
    super.trigger(name, options);

    // 将事件分发给模块
    this._dispatchModuleEvent(name, options);
  }
  /* ====== 事件模块 end =====*/

  /* == app LifeCycle start ====== */

  /**
   * 触发app生命周期
   * @param {String} lifeCycle 生命周期名
   * @param {Object} options 参数
   * @param {String} evtName 事件名
   */
  _performAppLifeCycle(lifeCycle, options, evtName) {
    if (typeof this.$app[lifeCycle] === 'function') {
      this.$app[lifeCycle](options);
    }

    this.$app.trigger(evtName, options);
  }

  /**
   * 应用生命周期,页面已启动
   * 在app的Context下执行
   * @param {Object} options 应用启动参数
   */
  launchApp(options) {
    this.$app = new this.__AppClazz();
    this.$app.$falcon = this;
    this.$app.$meta = this.__AppClazz.meta;
    this.$app.$meta = Object.assign(this.$app.$meta, this.$_appInfo);
    delete this.$_appInfo;
    delete this.__AppClazz.meta;
    this._performAppLifeCycle('onLaunch', options || {}, 'launch');
    return {
      viewPort: this.$app.viewPort || 0
    };
  }
  /**
   * 应用生命周期:应用在前台
   */
  showApp() {
    this._performAppLifeCycle('onShow', null, 'show');
  }

  /**
   * 应用生命周期:应用在后台(前台有其他应用或者锁屏等)
   */
  hideApp() {
    this._performAppLifeCycle('onHide', null, 'hide');
  }

  /**
   * 应用生命周期:应用销毁
   */
  destroyApp() {
    this._performAppLifeCycle('onDestroy', null, 'destroy');
  }

  /**
   * 应用全局错误信息监听
   */
  onAppError(err) {
    console.error('[Error]:', err.message, err.stack);
    this._performAppLifeCycle('onError', err, 'error');
  }
  /* == app LifeCycle end ====== */

  _vueErrorHandler(err, vm, info) {
    console.error(`[Vue Error]: Error in ${info}:${err.toString()}`);
    this.onAppError(err);
  }

  /* == page LifeCycle start ====== */
  /**
   * 加载页面
   * 页面生命周期,加载页面
   * @param {Integer} instanceId 页面id
   * @param {String} pageName  页面名称
   * @param {Object} options 页面启动参数
   */
  async loadPage(instanceId, pageName, options) {
    const wxInstance = createInstance(instanceId, '', {});
    const PageClass = await this.__loadModuleDefault(pageName);
    try {
      this.__loadPage(PageClass, pageName, wxInstance, instanceId, wxInstance.Vue, options);
    } catch (e) {
      this.onAppError(e);
    }
  }

  /**
   * 加载keyframe内容
   */
  __loadKeyFrames(page) {
    if (!page.$animation) {
      console.warn('please NOTE no $animation module');
    } else {
      if (page.$animation.loadKeyframes && this.__KEYFRAMES) {
        page.$animation.loadKeyframes.apply(null, this.__KEYFRAMES);
      }
    }
  }

  /**
   * 加载页面公共方法.web与native共用
   * 在onload之后调用.
   */
  __loadPage(PageClass, pageName, wxInstance, instanceId, Vue, options) {
    const isPageClass = PageClass.prototype instanceof Page;
    const page = isPageClass ? new PageClass() : new this.Page();

    // 如果不是一个Page对象,则给创建一个Page对象,并且把_component设置为Page的属性
    if (!isPageClass) {
      page._component = PageClass;
      page._component_only = true;
    }
    page._instance = wxInstance;
    this._pageMap.set(instanceId, page);

    page.$pageName = pageName;
    page.$pageId = instanceId;
    page.$app = this.$app;
    page.$falcon = this;

    // 解决Vue多实例共存时,组件构造器缓存导致$attr和$listenter访问报错问题
    Vue.cid = instanceId;
    Vue.use(falconPluginFactory(this, this.$app, page, wxInstance, instanceId));

    Vue.config.errorHandler = (err, vm, info) => { this._vueErrorHandler(err, vm, info); };

    // onLoad生命周期在页面首次初始化,vue实例化之前被调用
    this._performPageLifeCycle(instanceId, 'onLoad', options, 'load');

    // 页面初始化以前
    this._performPageLifeCycle(instanceId, 'beforeVueInstantiate', Vue, 'beforeVueInstantiate');

    // 关联预加载的页面模块属性,提前到mount之前,这样在组件实例化之后就可以访问了
    if (this.env.platform !== 'Web') {
      const pageModules = wxInstance.getRegisteredModules();
      for (const mod in pageModules) {
        const modName = `$${mod}`;
        if (page[modName]) {
          console.warn(`module conflict:${modName}`);
        } else {
          page[modName] = wxInstance.requireModule(mod);
        }
      }
      this.__loadKeyFrames(page);
    } else {
      if (this._apply_page_mode) {
        this._apply_page_mode(page, wxInstance);
      }
    }

    page.$root = new Vue(page._component);
    page.$root.$_page = page;

    page.$root.$mount('#root');
  }

  _performPageLifeCycle(instanceId, lifeCycle, options, evtName) {
    const page = this._pageMap.get(instanceId);
    if (page) {
      if (typeof page[lifeCycle] === 'function') {
        page[lifeCycle](options);
      }

      // 触发页面的生命周期事件
      page.trigger(evtName, options);

      // 页面生命周期同时通知给app,便于某些场景统一处理
      const pageLifeCycleOptions = {
        page: page,
        lifeCycle: evtName
      };
      this._performAppLifeCycle('onPageLifeCycle', pageLifeCycleOptions, 'pageLifeCycle');
    }
  }
  /**
   * 页面生命周期,页面显示时由native回调
   * @param {Integer} instanceId 页面id
   */
  showPage(instanceId) {
    this._performPageLifeCycle(instanceId, 'onShow', null, 'show');
  }

  /**
   * 页面生命周期,页面重新打开
   * @param {Integer} instanceId 页面id
   * @param {Object} options 重新打开参数
   */
  newPageOptions(instanceId, options) {
    this._performPageLifeCycle(instanceId, 'onNewOptions', options, 'newOptions');
  }

  /**
   * 页面生命周期,页面离开时由native调用
   * @param {Integer} instanceId 页面id
   */
  hidePage(instanceId) {
    this._performPageLifeCycle(instanceId, 'onHide', null, 'hide');
  }

  /**
   * 页面生命周期,卸载页面
   * @param {Integer} instanceId 页面id
   */
  unloadPage(instanceId) {
    this._performPageLifeCycle(instanceId, 'onUnload', null, 'unload');
    this._pageMap.delete(instanceId);
  }

  /* == page LifeCycle end ====== */

  /* page dom start */

  /**
   * 获取组件所在页面的Page对象
   * 获取失败或者组件未添加到组件树则返回空
   * @param {Object} component 组件
   */
  getPage(component) {
    return component.$page;
  }

  /* page dom end  */
}

/**
 * preview for web test
 */

const global = window;

global['$_Falcon'] = Falcon;

// fake env
global.WXEnvironment = {
  'platform': 'Web',
  'containerName': '',
  'containerVersion': '1.0.0',
  'osName': 'AliOSThings',
  'osVersion': '0.0.1',
  'deviceModel': 'AliOSThings',
  'deviceWidth': window.innerWidth,
  'deviceHeight': window.innerHeight
};

Falcon.initAppContext({}, global);

global.$falcon = Object.assign($falcon, driver);

function getPageName() {
  const search = window.location.hash;
  const query = search.split('#')[1];
  const pageName = query ? $falcon.util.parseQuery(query).page : null;
  return pageName || 'index'; // $falcon.app.meta.pages[0].name;
}

function registerHashChanged() {
  window.onhashchange = () => {
    $falcon.navTo(getPageName());
  };
}

function _boot(App, appJson) {
  App.meta = appJson;
  $falcon.__AppClazz = App;
  $falcon.launchApp();
  $falcon.showApp();

  $falcon.navTo(getPageName());
  registerHashChanged();
}

$falcon._web_boot_app = _boot;
