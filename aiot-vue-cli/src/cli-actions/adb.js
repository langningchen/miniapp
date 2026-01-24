const fs = require('fs');
const log = require('../libs/log');
const info = require('../libs/appinfo');
const { exec } = require('child_process');

var page;
var amrPath;
const defaultTgtPath = '/data/tmp.amr'

async function checkAdbExists()
{
  return new Promise((resolve, reject) => {
    exec('adb', (err, stdout, stderr) => {
      if (err) {
        reject(false);
      } else {
        resolve(true);
      }
    })
  })
}

async function adbPushFile(amrPath, tgtPath)
{
  return new Promise((resolve, reject) => {
    const cmd = `adb push ${amrPath} ${tgtPath}`
    console.log(`run: ${cmd}`)
    exec(cmd, (err, stdout, stderr) => {
      console.log(`output: ${stdout}\n${stderr}`.trim())
      if (err) {
        reject(false);
      } else {
        resolve(true);
      }
    })
  })
}

async function adbRunMiniappCli(adbCmd)
{
  return new Promise((resolve, reject) => {
    const cmd = `adb shell ${adbCmd}`
    console.log(`run: ${cmd}`)
    exec(cmd, (err, stdout, stderr) => {
      console.log(`output: ${stdout}\n${stderr}`.trim())
      if (err) {
        reject(false);
      } else {
        let obj = undefined
        for (let line of stdout.split('\n')) {
          if (line.startsWith('{')) {
            obj = JSON.parse(line.trim())
            break
          }
        }
        if (!obj) {
          reject(false)
        } else {
          resolve(obj)
        }
      }
    })
  })
}

async function adbRemoveFile(tgtPath)
{
  return new Promise((resolve, reject) => {
    const cmd = `adb shell rm ${tgtPath}`
    console.log(`run: ${cmd}`)
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(false);
      } else {
        resolve(true);
      }
    })
  })
}

//判断文件是否存在
function isFileExisted(path_way) {
  return new Promise((resolve, reject) => {
    fs.access(path_way, (err) => {
      if (err) {
        reject(false);//"不存在"
      } else {
        resolve(true);//"存在"
      }
    })
  })
};

module.exports = async function (appPath, cmd) {
  const page = cmd.page;
  let amrPath = appPath;

  if (!amrPath) {    
    amrPath = info.getAmrPath()
    if (!amrPath) {
      log.error('请输入应用安装包路径: \nUsage: aiot-cli adb <amrPath>');
      return;
    }
  }

  let failCnt = 0
  let res1
  console.log('STEP1: push')

  try {
    await isFileExisted(amrPath)
  } catch (err) {
    console.error('本地amr包不存在，请执行tnpm run build命令或检查amr包路径后重试')
    return -2
  }

  try {
    res1 = await adbPushFile(amrPath, defaultTgtPath)
  } catch (error) {
    console.log(error.message)
    return -3
  }
  
  if (!res1) {
    console.error(`错误：push 失败，请检查是否有 adb 工具\n`)
    failCnt += 1
    return -4
  } else {
    console.info(`成功：push 成功\n`)
  }

  console.log('STEP2: install')

  let res2
  try {
    res2 = await adbRunMiniappCli(`miniapp_cli install ${defaultTgtPath}`)
  } catch (error) {
    console.log(error)
    return -5
  }

  if (!res2 || res2.ret != 0) {
    console.error(`错误：install 失败，请检查设备是否有 miniapp_cli\n`)
    failCnt += 1
    return -6
  } else {
    console.info(`成功：install 成功\n`)
  }

  console.log('STEP3: start')

  let res3 
  try {
    res3 = await adbRunMiniappCli(`miniapp_cli start ${res2.appid} ${page?page:''}`.trim())
  } catch (error) {
    console.log(error)
    return -7
  }

  if (!res3 || res3.ret!= 0) {
    console.error(`错误：start 失败，请检查设备是否有 miniapp_cli\n`)
    failCnt += 1
  } else {
    console.info(`成功：start 成功\n`)
  }

  await adbRemoveFile(defaultTgtPath)

  if (failCnt !== 0) {
    console.error('安装app失败')
    return -8
  } else {
    console.info('安装app成功')
  }
}
