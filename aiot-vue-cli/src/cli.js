#!/usr/bin/env node

const { program } = require('commander');
const pkgJson = require('../package.json');
const actionCreate = require('./cli-actions/create');
const actionSimulator = require('./cli-actions/simulator');
const { webPreview, webBuild } = require('./cli-actions/web');
const deviceBuild = require('./cli-actions/build')
const checkUpdate = require('./cli-actions/check-update')
const AppInfo = require('./libs/appinfo');
const NucChecker = require('./check-update/NcuChecker.js')
const fs = require("fs")
const os = require('os')
const path = require('path')
const internetAvailable = require("internet-available");
const confPath = path.join(os.homedir(), '.aiot-cli.conf')
const chalk = require('chalk')
const upload = require('./cli-actions/upload.js')
const adb = require('./cli-actions/adb.js')
const request = require('request')
const uploadCliActivation = require('./cli-actions/utils/UploadInfo')
const store = require('data-store')({ path: os.homedir() + '/.aiot-cli.conf' });

let globalResult
let name
let conf = {}
if (fs.existsSync(confPath)) {
  let confContent
  try {
    confContent = fs.readFileSync(confPath, 'utf8')
  } catch (err) {
    console.error(chalk.yellow(`读取配置失败`))
    console.error(`配置路径：${confPath}`)
  }
  try {
    conf = JSON.parse(confContent)
  } catch (err) {
    console.error(chalk.yellow(`解析配置失败 ${err}`))
    console.error(`配置路径：${confPath}`)
  }
}

async function shouldCheck(thisCommand) {
  const opts = thisCommand.opts()
  if (opts.silent) {
    // do not check in silent mode
    return
  }
  if (!opts.check) {
    return
  }
  try {
    await internetAvailable({
      timeout: 1700,
      retries: 0,
      domainName: 'registry.npmmirror.com'
    })
  } catch (err) {
    // console.error(err)
    return false
  }
  if (conf['debug_check']) return true
  let lastCheckedTime = store.get('lastCheckedTime')
  let ts
  try {
    ts = parseInt(lastCheckedTime)
  } catch (e) {
    console.log(e)
  }
  if (isNaN(ts)) return true
  const curTs = new Date().getTime()
  if (curTs > ts + 24*60*60*1000) { // each day
    return true
  }
  return false
}

function markChecked() {
  const curTs = new Date().getTime()
  store.set('lastCheckedTime', `${curTs}`)
}

program.version(pkgJson.version)
  .option('-d, --dir <type>', `打包工程所在目录`, './')
  .option('--check', '检查版本', false)
  .option('-s, --silent', '静默无提示', false)
  .hook('preAction', async (thisCommand, actionCommand) => {
    // CLI激活数据上报
    uploadCliActivation('activation');

    const cmdName = actionCommand.name()
    const opts = thisCommand.opts()
    console.info(`cli版本: ${pkgJson.name}@${pkgJson.version}`)
    console.info(`正在执行 ${cmdName} ${actionCommand.args.join(' ')}`)
    if (actionCommand._optionValues.noPath) {
      if (cmdName !== 'create' && cmdName !== 'check' && cmdName !== 'c' && cmdName !== 'r') {
        if (!await AppInfo.init(opts.dir)) {
          return
        }
      }
    } else {
      if (cmdName !== 'create' && cmdName !== 'check' && cmdName !== 'upload' && cmdName !== 'c' && cmdName !== 'r' && cmdName !== 'u') {
        if (!await AppInfo.init(opts.dir)) {
          return
        }
      }
    }
  })
  .hook('postAction', async (thisCommand, actionCommand) => {
    const cmdName = actionCommand.name()
    if (cmdName !== 'check' && cmdName !== 'u' && AppInfo.isValidRoot()) {
      // console.info('\n正在检查版本...')
      let check = await shouldCheck(thisCommand)
      if (check === true) {
        const checker = new NucChecker({verbose: false})
        await checker.normalCheck()  // check quickly and periodly
        console.log(checker.step)
        // if (checker.step === 0) {
          markChecked()
        // }
      }
    }
  })

//创建小程序命令
for (command of ['create', 'c']) {
  program
    .command(command)
    .arguments('[name]', '小程序名称')
    .description('创建小程序')
    .action(async (...args) => globalResult = await actionCreate(...args))
}

for (name of ['simulator', 's']) {
  program
    .command(name)
    .description('模拟器预览小程序')
    .option('--simpath <simulator>', `模拟器路径`, '')
    .option('-p, --page <page>', `预览页面`, '')
    .action(async (...args) => globalResult = await actionSimulator(...args))
}

for (name of ['preview', 'p']) {
  program
    .command(name)
    .description('浏览器预览应用')
    .action(async (...args) => globalResult = await webPreview(...args))
}

for (name of ['build-web', 'w']) {
  program
    .command(name)
    .description('构建web')
    .action(async (...args) => globalResult = await webBuild(...args))
}

for (name of ['upload', 'u']) {
  program
    .command(name)
    .description('上传小程序')
    .option('-h, --host <ip>', `主机IP`, '127.0.0.1')
    .option('--port <port>', '端口号', '5556')
    .option('-p, --page <page>', '启动页面', 'index')
    .option('-n, --noPath', '是否传入安装路径', false)
    .argument('[path]', '安装路径')
    .action(async (...args) => globalResult = await upload(...args))
}

for (name of ['adb', 'a']) {
  program
   .command(name)
   .description('adb命令')
   .option('-p, --page <page>', '启动页面', 'index')
   .argument('[path]', '安装路径')
   .action(async (...args) => globalResult = await adb(...args))
}

for (name of ['build', 'b']) {
  program
    .command(name, { isDefault: true })
    .description("构建应用")
    .option('-c, --compress', `是否压缩脚本`, false)
    .option('-q, --qjsc', `是否使用qjsc预编译`, false)
    .option('-p, --pack', `是否打包`, false)
    .option('-m, --mock', `是否模拟 JSAPI`, false)
    .option('-e, --env <var...>', `加入环境变量`)
    .action(async (...args) => globalResult = await deviceBuild(...args))
}

for (name of ['check', 'r']) { // renew
  program
    .command(name)
    .description('检查和更新')
    .option('-b, --core-beta', `核心包升级范围包括 beta 版本（先行测试版本）`, false)
    .option('-a, --core-all-versions', `核心包升级范围为全部版本（跨版本不能向后兼容）`, false)
    .action(async (...args) => globalResult = await checkUpdate(...args))
}

program.showHelpAfterError()

process.on('uncaughtException', err => {
  console.error(err)
  process.exitCode = -1
});

(async function() {
  try {
    await program.parseAsync(process.argv)
    if (typeof globalResult === 'number') {
      process.exit(globalResult)
    }
  } catch (e) {
    console.error(e)
    process.exit(-1)
  }
})()
