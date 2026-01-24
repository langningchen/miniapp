#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { program } = require('commander');
const pkgVersion = require('./package.json').version;

const compile = require('./libs/qjsc').compileJs;

const SUPPORT_QJSC_VERSIONS = ["20200412", "20200705", "20200906"];
const STR_SUPPORT_VERSIONS = SUPPORT_QJSC_VERSIONS.join(',');
const QJSC_VERSIONS = new Set(SUPPORT_QJSC_VERSIONS);


program
  .version(pkgVersion)
  .option('-v, --qjs_ver <type>', `指定quickjs版本,支持版本:${STR_SUPPORT_VERSIONS}`)
  .option('-b, --bigNum', '是否开启quickjs的bigNum', false)
  .option('-f, --file <type>', '指定编译的js文件')
  .option('-o, --output [type]', '输出文件路径')
  .option('-m, --module', '是否以module方式编译')
  .option('-i, --internal', '内置模块列表(多个以","分割)', '')
  .parse(process.argv);



let { qjs_ver, bigNum, file, output, module: _mod, internal } = program;

//check params
if (!QJSC_VERSIONS.has(qjs_ver)) {
  console.error(`需指定quickjs版本号,可选版本:${STR_SUPPORT_VERSIONS}`);
  return;
}

if (!file) {
  console.error('请使用-f指定需要编译的js文件');
  return;
}

let inputFile = path.resolve(process.cwd(), file);

if (!fs.existsSync(inputFile)) {
  console.error('指定文件不存在:', inputFile);
  return false;
}

let outputFile = output;
if (!outputFile) {
  outputFile = inputFile + ".bin";
}

let success = compile(inputFile, outputFile, {
  version: qjs_ver,
  bigNum: bigNum,
  module: _mod,
  internal: internal.split(',')
});
if (success) {
  console.log('输出文件:', outputFile);
} else {
  console.log('生成失败!');
}
