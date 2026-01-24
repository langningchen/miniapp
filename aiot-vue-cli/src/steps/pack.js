/**
 * 打包
 */

const fs = require('fs');
const path = require('path');
const compressing = require('compressing');
const pump = require('pump');
const appInfo = require('../libs/appinfo');
const colors = require('colors-console');


//打包
async function packZip() {
  const DIST_DIR = appInfo.getFalconBuildDir();

  const DIST_FILE = appInfo.getAmrPath()

  return new Promise((resolve, reject) => {
    //重新打包
    const zipStream = new compressing.zip.Stream();
    const destStream = fs.createWriteStream(DIST_FILE);

    let zipDirFiles = fs.readdirSync(DIST_DIR);
    zipDirFiles.forEach((file, index) => {
      // console.log('add entry:', file)
      zipStream.addEntry(path.resolve(DIST_DIR, file))
    })

    pump(zipStream, destStream, async (err) => {
      if (err) {
        reject(false);
      } else { 
        console.log(colors('green', '打包成功,路径:' + DIST_FILE));
        resolve(true);
      }
    });
  });
}

exports.pack = packZip;

