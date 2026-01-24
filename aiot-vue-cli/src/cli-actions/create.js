const fs = require('fs');
const path = require('path');
const compressing = require('compressing');
const log = require('../libs/log');
const chalk = require('chalk')
const uploadCliActivity = require('./utils/UploadInfo')

//模板工程文件
const TEMPLATE_ZIPFILE_PATH = path.resolve(__dirname, '../../assets/template.zip');

/**
 * 更新package.json中的信息
 */
function modifyInfo(distDir, name) {
  const appPkg = require(path.resolve(distDir, './package.json'));
  const cliPkg = require(path.resolve(__dirname, '../../package.json'));

  // appPkg.devDependencies['aiot-vue-cli'] = '^' + cliPkg.version;
  appPkg['name'] = name;
  appPkg['appid'] = '800' + (new Date()).valueOf();

  fs.writeFileSync(path.resolve(distDir, './package.json'), JSON.stringify(appPkg, null, 2));
}

module.exports = async function (name) {
  // 上报create埋点
  uploadCliActivity('activity', 'create_project')

  if (!name) {
    log.error('请输入应用目录名称: \nUsage: aiot-cli create <name>');
    return;
  }

  const distDir = path.resolve(process.cwd(), name);
  if (fs.existsSync(distDir)) {
    log.error(`创建失败,目录:"${distDir}" 已存在!`);
    return;
  }

  await compressing.zip.uncompress(TEMPLATE_ZIPFILE_PATH, distDir).then(() => {
    modifyInfo(distDir, name);
    log.success('创建成功,可以使用以下命令初始化应用:');
    console.log(chalk.cyan(
      `cd ${name}
cnpm install
  `))
  }).catch((e) => {
    console.log('创建失败', e);
  })
}

