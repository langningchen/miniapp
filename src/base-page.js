// Copyright (C) 2025 Langning Chen
// 
// This file is part of miniapp.
// 
// miniapp is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// miniapp is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

const DEBUG = false
function _collectFalconEventIds(name, callback)
{
  const evtList = $falcon.eventMap[name]
  if (evtList) {
    if (callback) {
      const index = evtList.findIndex(item => item.callback === callback || item.id === callback);
      if (index !== -1) {
        return [evtList[index].id]
      }
    } else {
      return evtList.map((item) => item.id)
    }
  }
  return []
}

class PageRes extends $falcon.Page {
  constructor() {
    super()
    this.falconOnTokens = []  // [[token, name], ...]
    this.timeoutTokens = new Set()  // [token, ...]
    this.intervalTokens = new Set()  // [token, ...]
  }

  on(name, callback) {
    const token = $falcon.on(name, callback)
    this.falconOnTokens.push([token, name])
    return token
  }

  off(name, callback) {
    const falconOnTokens2 = []
    let idsWillRemoved = _collectFalconEventIds(name, callback)
    DEBUG && console.log(`idsWillRemoved ${JSON.stringify(idsWillRemoved)}`)
    idsWillRemoved = new Set(idsWillRemoved)
    for (let [token, name] of this.falconOnTokens) {
      if (idsWillRemoved.has(token)) {
        continue
      }
      falconOnTokens2.push([token, name])
    }
    this.falconOnTokens = falconOnTokens2

    $falcon.off(name, callback)
  }
  trigger(name, options) {
    $falcon.trigger(name, options)
  }
  setTimeout(func, ms) {
    const token = setTimeout(() => {
      this.timeoutTokens.delete(token)
      func()
    }, ms)
    this.timeoutTokens.add(token)
    return token
  }
  setInterval(func, ms) {
    const token = setInterval(func, ms)
    this.intervalTokens.add(token)
    return token
  }
  clearTimeout(token) {
    this.timeoutTokens.delete(token)
    clearTimeout(token)
  }
  clearInterval(token) {
    this.intervalTokens.delete(token)
    clearInterval(token)
  }
  release() {
    for (let [token, name] of this.falconOnTokens) {
      DEBUG && console.log(`release $falcon.on token ${token}`)
      $falcon.off(name, token)
    }
    this.falconOnTokens.length = 0
    for (let token of this.timeoutTokens) {
      DEBUG && console.log(`release setTimeout token ${token}`)
      clearTimeout(token)
    }
    this.timeoutTokens.clear()
    for (let token of this.intervalTokens) {
      DEBUG && console.log(`release setInterval token ${token}`)
      clearInterval(token)
    }
    this.intervalTokens.clear()
  }
}

export class BasePage extends PageRes {
  /**
   * 构造函数,页面生命周期内只执行一次
   */
  constructor() {
    super()
  }

  // some Util
  async sleep(ms) {
    return new Promise((resolve) => {
      this.setTimeout(() => {
        resolve()
      }, ms)
    })
  }


  /**
   * 页面生命周期:首次启动
   * @param Object options 页面启动参数
   */
  onLoad(options) {
    super.onLoad(options)
    this.options = options
  }

  /**
   * 页面生命周期:页面重新进入
   * 其他应用或者系统通过$falcon.navTo()方法重新启动页面.可以通过这个回调拿到新启动的参数
   * @param Object options 重新启动参数
   */
  onNewOptions(options) {
    super.onNewOptions(options)
    this.options = options
  }

  /**
   * 页面生命周期:页面进入前台
   */
  onShow() {
    super.onShow()

    //onshow以后组件才创建,可以调用组件的方法
    if (this.$root.onShow) {
      this.$root.onShow()
    }
  }

  /**
   * 页面生命周期:页面进入后台
   */
  onHide() {
    super.onHide()
    if (this.$root.onHide) {
      this.$root.onHide()
    }
  }

  /**
   * 页面生命周期:页面卸载
   */
  onUnload() {
    try {
      super.onUnload()
      if (this.$root.onUnload) {
        this.$root.onUnload()
      }
    } finally {
      if (this.release) {
        // to call PageRes release method
        this.release()
      }
    }
  }

  beforeVueInstantiate(Vue) {
    try {
      Vue.prototype.$workspace = globalThis.$workspace
      Vue.prototype.$appid = globalThis.$appid
    } catch (err) {
      console.log(err)
    }
  }
}
