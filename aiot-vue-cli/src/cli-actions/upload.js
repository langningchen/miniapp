const FormData = require('form-data');
const axios = require('axios')
const fs = require('fs');
const http = require('http');
const log = require('../libs/log');
const info = require('../libs/appinfo');
const uploadCliActivity = require('./utils/UploadInfo')

var host;
var port;
var page;
var amrPath;

function post0(options) {
  return axios.post(`http://${host}:${port}${options.path}`, options.data, {
    headers: options.headers,
    timeout: 5000, // 设置超时时间，以毫秒为单位
    headers: {
      'Content-Type': 'application/json',
    }
  }).catch((error)=> {
    if (error.code === "ECONNABORTED") {
      console.log("Request timed out")
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`无法与设备建立socket连接，请检查网络后重试`)
    } else {
      console.log("Request error:", error)
    }
    throw error
  })
}

async function postForm(path, files, datas) {
  const form = new FormData();
  if (files) {
    for (let key of Object.keys(files)) {
      form.append(key, fs.createReadStream(files[key]));
    }
  }
  if (datas) {
    for (let key of Object.keys(datas)) {
      form.append(key, datas[key]);
    }
  }

  return axios.post(`http://${host}:${port}${path}`, form, {
    headers: form.getHeaders(),
    timeout: 10000, // 设置超时时间，以毫秒为单位
  }).catch((error)=> {
    if (error.code === "ECONNABORTED") {
      console.log("Request timed out")
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`无法与设备建立socket连接，请检查网络后重试`)
    } else {
      console.log("Request error:", error)
    }
    throw error
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
  // 上报upload埋点
  uploadCliActivity('activity', 'upload_device')

  host = cmd.host;
  port = cmd.port;
  page = cmd.page;
  amrPath = appPath;
  let noPath = cmd.noPath;

  if (!amrPath) {
    if (noPath) {
      if (!info.isValidRoot()) {
        return -1
      }
      amrPath = info.getAmrPath()
    } else if (!noPath && !appPath) {
      log.error('请输入应用安装包路径: \nUsage: aiot-cli upload <amrPath>');
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
    res1 = await postForm('/push', { 'pkg': amrPath })
  } catch (error) {
    console.log(error.message)
    return -3
  }
  
  if (res1.status !== 200) {
    console.log('amr包写入设备失败，请设置设备分区读写权限后重试，如：chmod -R 777 /data')
  }
  console.log(`push res ${JSON.stringify(res1.data)}`)

  if (res1.data.ret !== 0) {
    console.error(`错误：push 失败\n`)
    failCnt += 1
    return -4
  } else {
    console.info(`成功：push 成功\n`)
  }

  console.log('STEP2: install')

  let res2
  try {
    res2 = await post0({
      path: '/install',
      data: JSON.stringify({
        "path": res1.data.fpath,
      }),
    })
  } catch (error) {
    console.log(error.message)
    return -5
  }

  console.log(`install res ${JSON.stringify(res2.data)}`)

  if (res2.status !== 200 || res2.data.ret !== 0) {
    console.error(`错误：install 失败\n`)
    failCnt += 1
    return -6
  } else {
    console.info(`成功：install 成功\n`)
  }

  console.log('STEP3: start')

  let res3 
  try {
    res3 = await post0({
      path: '/start',
      data: JSON.stringify({
        "appID": res2.data.appid,
        "page": page ? page : undefined,
      })
    })
  } catch (error) {
    console.log(error.message)
    return -7
  }
  console.log(`start res ${JSON.stringify(res3.data)}`)

  if (res3.status !== 200 || res3.data.ret !== 0) {
    console.error(`错误：start 失败\n`)
    failCnt += 1
  } else {
    console.info(`成功：start 成功\n`)
  }

  if (failCnt !== 0) {
    console.error('安装app失败')
    return -8
  } else {
    console.info('安装app成功')
  }
}
