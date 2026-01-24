/**
 * 常用工具类库
 */

const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const { dirname } = require('path');
 
/**
 * 启动子进程执行命令行方法
 * 
 * @param {String} cmd 需要执行的命令
 * @param {Array} args 参数数组
 * @param {String} 命令行执行根目录
 */
async function exec(cmd, args, root) {
  return new Promise((resolve, reject) => {
    let spawn = childProcess.spawn(cmd, args, {
      cwd: path.resolve('./', root)
    });
    spawn.stdout.on('data', (data) => {
      console.log(`${data}`);
    });

    spawn.stderr.on('data', (data) => {
      console.log(`${data}`);
    });

    spawn.on('error', (error) => {
      console.log('onerror:', error);
    });

    spawn.on('close', (code) => {
      if (code == 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    })
  });
}

async function mkdirs(dirPath){
  if(!dirPath){
    return false;
  }
  if(fs.existsSync(dirPath)){
    return true;
  }

  let success = mkdirs(path.dirname(dirPath));
  if(success){
    fs.mkdirSync(dirPath);
    return true;
  }
  return false;
}

exports.exec = exec;
exports.mkdirs = mkdirs;