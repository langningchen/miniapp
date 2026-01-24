/**
 * 用qjsc对js进行预编译.
 * 1.调用qjsc命令行,将js转成cpp
 * 2.正则匹配读取cpp中的字符内容,保存成.js.bin
 */

const fs = require('fs');
const path = require('path');

const exec = require('./libs.js').exec;

const uniqueId = (function () {
  let currentId = 0;
  return function () {
    return ++currentId
  };
})();

/*
 *  
 * 正则匹配读取
 * const uint8_t qjsc_filename[123] = {
 *  ...
 * }
 * 之间的内容
 */
function generagePattern(cname) {
  return new RegExp(`const uint8_t ${cname}\\\[\\d+\\\] = {([^}]+)}`);
}

const platform = process.platform;
const arch = process.arch;

/**
 * 根据配置获取对应的qjsc可执行文件
 */
function getQjscPath(cfg) {
  //TODO:考虑后缀
  let ext = platform == 'win32' ? '.exe' : '';
  if (platform == 'darwin') {
    //TODO:考虑osx arm64和osx x64
    return path.resolve(__dirname, '../assets/bin/', platform, arch, `qjsc${cfg.bigNum ? 'bn' : ''}${cfg.version}${ext}`);
  } else {
    return path.resolve(__dirname, '../assets/bin/', platform, `qjsc${cfg.bigNum ? 'bn' : ''}${cfg.version}${ext}`);
  }
}

/**
 * 
 * @param {String} appContent 将cpp内容转成js的bin
 * @returns {Buffer} cpp中的二进制buffer
 */
function convertCppToJsBin(cppContent, cname) {
  const reg = generagePattern(cname);
  const result = reg.exec(cppContent);

  let strBinary = result[1].replace(/[\n|\n\r]/g, '');

  let bufferArr = [];
  strBinary.split(',').forEach((item, index) => {
    let strHex = item.trim().substr(2);
    if (strHex !== '') {
      bufferArr.push(parseInt(strHex, 16));
    }
  });

  // console.log('bufferArr.length:', bufferArr.length);
  return Buffer.from(bufferArr);
}


/**
 * 编译js文件,保存到{binFilePath}路径
 * @param {String} jsFilePath 需要编译的js文件路径
 * @param {String} binFilePath 生成的目标文件(.js.bin)路径
 * @param {Object} 预编译配置信息,包括quickjs版本号(String),bignum开关(Boolean),是否module编译(Boolean),内置模块列表(Array)
 * @returns {Boolean} 是否生成成功 
 */
async function compileJs(jsFilePath, binFilePath, cfg) {
  //执行命令如:'qjsc -o JSFramework.cpp -c miniapp-js-framework.js'
  if (!fs.existsSync(jsFilePath)) {
    console.error('compileJs fail, file not exits:', jsFilePath);
    return false;
  }
  let execRoot = path.resolve(jsFilePath, '../');
  let temp_cpp_file = jsFilePath + ".c";
  let cname = `qjsc_convert_c_v_${uniqueId()}`; //指定生成的c文件中变量的名字
  let args = ['-N', cname, '-o', temp_cpp_file, '-c', path.basename(jsFilePath)];

  //支持-m参数,编译为module
  if (cfg.module) {
    args.unshift('-m');
  }

  // 容器内置的模块
  if (cfg.internal) {
    cfg.internal.forEach((item, index) => {
      if (item) {
        args.unshift(item)
        args.unshift('-M');
      }
    });
  }

  let qjscPath = getQjscPath(cfg);
  let success = await exec(qjscPath, args, execRoot);
  if (!success || !fs.existsSync(temp_cpp_file)) {
    console.error('compile js to c fail!');
    return false;
  }

  try {
    let cppContent = fs.readFileSync(temp_cpp_file);
    let compiledBuffer = convertCppToJsBin(cppContent, cname);
    fs.unlinkSync(temp_cpp_file);

    if (binFilePath) {
      fs.writeFileSync(binFilePath, compiledBuffer);
    };
  } catch (e) {
    console.log(e.message);
    return false;
  }
  return true;
}

exports.compileJs = compileJs;