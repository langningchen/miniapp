// Helper functions
const path = require('path');
const fs = require('fs');
const process = require('process');

// const ROOT = path.resolve(process.cwd());

const appInfo = require('../../libs/appinfo');
const ROOT = appInfo.getAppRoot();



const projectRoot = () => {
  return path.resolve(ROOT);
}

const root = (args) => {
  return path.join(ROOT, 'src', args);
}
const rootNode = (args) => {
  return path.join(ROOT, args);
}

const resolve = (dir) => {
  return path.join(ROOT, dir)
}

const fileContent = (fileName) => {
  return fs.readFileSync(fileName, 'utf-8');
}

const appScript = () => {
  let appJsFilePath = path.resolve(ROOT, 'src/app.js');
  return fileContent(appJsFilePath);
}

module.exports = {
  root,
  rootNode,
  resolve,
  fileContent,
  appScript,
  projectRoot
}