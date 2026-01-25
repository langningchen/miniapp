import { Command } from 'commander';
import { version } from '../package.json';
// import actionSimulator from './cli-actions/simulator.js';
// import { webPreview, webBuild } from './cli-actions/web.js';
import deviceBuild from './cli-actions/build.js';
import { init } from './libs/appinfo';
// import upload from './cli-actions/upload.js';
// import adb from './cli-actions/adb.js';
import actionCreate from './cli-actions/create';

const program = new Command();

program
  .version(version)
  .option('-d, --dir <type>', `打包工程所在目录`, './')
  .option('-s, --silent', '静默无提示', false)
  .hook('preAction', (thisCommand, actionCommand) => {
    const cmdName = actionCommand.name();
    const opts = thisCommand.opts();
    console.info(`正在执行 ${cmdName} ${actionCommand.args.join(' ')}`);
    if (!init(opts.dir)) return;
  });

program
  .command('create')
  .description('创建小程序')
  .argument('<name>', '小程序名称')
  .action((name: string) => {
    actionCreate(name);
  });

program
  .command('simulator')
  .description('模拟器预览小程序')
  .option('--simpath <simulator>', `模拟器路径`, '')
  .option('-p, --page <page>', `预览页面`, '')
  .action((...args: any[]) => {
    // actionSimulator(...args);
  });

program
  .command('preview')
  .description('浏览器预览应用')
  .action(() => {
    // webPreview();
  });

program
  .command('build-web')
  .description('构建web')
  .action(() => {
    // webBuild();
  });

program
  .command('upload')
  .description('上传小程序')
  .option('-h, --host <ip>', `主机IP`, '127.0.0.1')
  .option('--port <port>', '端口号', '5556')
  .option('-p, --page <page>', '启动页面', 'index')
  .option('-n, --noPath', '是否传入安装路径', false)
  .argument('[path]', '安装路径')
  .action(async (appPath: string, cmd) => {
    // upload(appPath, cmd);
  });

program
  .command('adb')
  .description('adb命令')
  .option('-p, --page <page>', '启动页面', 'index')
  .argument('[path]', '安装路径')
  .action(async (appPath: string, cmd) => {
    // adb(appPath, cmd);
  });

program
  .command('build')
  .description('构建应用')
  .option('-c, --compress', `是否压缩脚本`, false)
  .option('-q, --qjsc', `是否使用qjsc预编译`, false)
  .option('-p, --pack', `是否打包`, false)
  .option('-m, --mock', `是否模拟 JSAPI`, false)
  .option('-e, --env <var...>', `加入环境变量`)
  .action(async (cmd) => {
    deviceBuild(cmd);
  });

program.showHelpAfterError();

program.parse();
