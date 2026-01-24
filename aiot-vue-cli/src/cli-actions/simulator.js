/**
 * 模拟器预览小程序
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const info = require('../libs/appinfo');
const build = require('../steps/build');
const log = require('../libs/log');
const uploadCliActivity = require('./utils/UploadInfo')

let uiProcess = null;
let simulator = null;

async function run(page) {
  try {
    const args = [info.getFalconBuildDir()];
    if (page) {
      args.push(page)
    } else if (simulator && simulator.page) {
      args.push(simulator.page);
    }
    if (info.isWin) {
      exec('.\\appx.exe', args);
    } else {
      exec('./appx', args);
    }
  } catch (e) {
    console.log('onerror:', e);
    return false;
  }
  return true;
}

function exec(cmd, args) {
  console.log(`${cmd} ${args.join(' ')}`)
  let spawn = childProcess.spawn(cmd, args, {
    cwd: simulator.path,
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  // if use "stdio: inherit" above, the spawn stdout stderr will be null
  //spawn.stdout.on('data', (data) => {
  //  console.log(`data:${data}`);
  //});

  //spawn.stderr.on('data', (data) => {
  //  console.log(`stderr:${data}`);
  //});

  spawn.on('error', (code) => {
    console.log(`onerror:${code}`);
  });

  spawn.on('close', (code) => {
    console.log(`close:${code}`);
  });

  spawn.on('exit', (code) => {
    console.log(`exit: ${code} `);
  });

  process.on('SIGINT', function () {
    console.log('Exit now!');
    // spawn.stdin.write("exit\n");
    process.exit();
  });
  uiProcess = spawn;
}

function refresh() {
  if (uiProcess == null) {
    console.warn('ui process is null!');
    return;
  }
  const cmd = `relaunch ${info.getFalconBuildDir()} ${(simulator.page || '')}\n`;
  console.log('refresh cmd')
  uiProcess.stdin.write(cmd);
}

function deleteBinFiles(folderPath) {
  const fs = require('fs');
  const path = require('path');
  let forlder_exists = fs.existsSync(folderPath);
  if (forlder_exists) {
    let fileList = fs.readdirSync(folderPath);
    fileList.forEach(function (fileName) {
      if (fileName.endsWith('.bin'))
        fs.unlinkSync(path.join(folderPath, fileName));
    });
  }
}

//小于这个时间内的文件变化不build
let BUILD_INTERVAL = 500;
let buildTimerId = 0;
function watch() {
  fs.watch(info.getAppSourceDir(), { recursive: true }, () => {
    if (buildTimerId) {
      clearTimeout(buildTimerId);
    }
    buildTimerId = setTimeout(async () => {
      deleteBinFiles(path.resolve(info.getAppRoot(), '.falcon_'))
      await build({ minify: false, mock: true })
      refresh();
      buildTimerId = 0;
    }, BUILD_INTERVAL);
  });
}

module.exports = async function (command) {
  // 上报simulator埋点
  uploadCliActivity('activity', 'launch_simulator')

  const path = command.simpath;
  const page = command.page;
  if (!info.isValidRoot()) {
    return -1
  }
  simulator = info.getAppPackageInfo().simulator;
  if (typeof (path) !== "undefined" && path !== "" && path !== null) {
    simulator.path = path;
  }
  console.log(simulator);
  if (!simulator || !simulator.path) {
    log.error('请配置模拟器路径:');
    console.log(`请在工程目录下package.json中配置模拟器信息:
{
  // ...
  "simulator": {
    "path": "/path/to/simulator/",
    "page": "default_start_page (可选)"
  },
  //...
}`);
    return;
  }


  // 首次运行的时候先build一次,解决首次预览找不到路径问题
  await build({ minify: false, mock: true })

  run(page);
  watch();
}
