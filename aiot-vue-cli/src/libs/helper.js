/**
 * 帮助方法集合
 */
const fs = require('fs');
const path = require('path')
const crypto = require('crypto');
const { getPort } = require('portfinder');

const QUERY_REG = /([^=&\s]+)[=\s]*([^&\s]*)/g;

const Helper = {
  /**
   * 读取json文件,返回json对象
   * 文件不存在返回null
   * @param {string} path
   */
  getJson(path) {
    if (fs.existsSync(path)) {
      return require(path);
    }
    return null;
  },

  /**
   * 读取文件内容,返回字符串
   * @param {string} path 
   */
  getContent(path) {
    return fs.readFileSync(path, 'utf-8');
  },

  /**
   * 写入文件内容
   * @param {String} path 路径
   * @param {String} content 内容
   */
  writeContent(path, content) {
    fs.writeFileSync(path, content);
  },

  md5(data) {
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
  },

  async findPort(port) {
    return new Promise((resolve, reject) => {
      getPort({ port: port },
        (err, port) => {
          if (err) {
            console.log(err);
            reject();
          } else {
            resolve(port);
          }
        }
      );
    });
  },
  parseQuery(query) {
    const obj = {};
    while (QUERY_REG.exec(query)) {
      obj[RegExp.$1] = RegExp.$2;
    }
    return obj;
  },

  walk(dir) {
    return new Promise((resolve, reject) => {
      var results = [];
      fs.readdir(dir, (err, list) => {
        if (err) return reject(err);
        var pending = list.length;
        if (!pending) return resolve(results);
        list.forEach((file) => {
          file = path.resolve(dir, file);
          fs.stat(file, (err, stat) => {
            if (stat && stat.isDirectory()) {
              this.walk(file).then((res) => {
                results = results.concat(res);
                if (!--pending) resolve(results);
              }).catch((err) => {
                reject(err)
              })
            } else {
              results.push(file);
              if (!--pending) resolve(results);
            }
          })
        })
      })
    })
  }
}

module.exports = Helper;
