const appInfo = require('./appinfo.js');
const fs = require('fs')
const path = require('path')
const log = require('./log.js')

// theme
function getThemeImportSource(styleOpts) {
  let FALCON_THEME = 'export default {}'
  let FALCON_THEME_CUSTOM = 'export default {}'
  let theme = styleOpts.theme || 'theme-default'
  let themeCustom = styleOpts.themeCustom || ''

  if (theme) {
    const themePath = path.resolve(path.join(appInfo.getAppRoot(), 'node_modules/falcon-ui', `src/styles/${theme}/theme.config.js`))
    if (!fs.existsSync(themePath)) {
      log.warn(`WARNING: 找不到theme "${theme}"，请检查 falcon-ui 是否安装，路径：${themePath}`)
    } else {
      FALCON_THEME = `
export {default} from "${themePath.replace(/\\/g, '\\\\')}";
`
    }
  }
  if (themeCustom) {
    const themeCustomDir = path.resolve(path.join(appInfo.getAppRoot(), `src/styles/${themeCustom}`))
    const themeCustomPath = path.join(themeCustomDir, `theme.config.js`)
    // always show warning if the themeCustom user specified is not exists
    if (styleOpts.themeCustom && !fs.existsSync(themeCustomDir)) {
      log.warn(`WARNING: 找不到自定义theme "${themeCustom}"，请检查路径：${themeCustomDir}`)
    }
    // then only generate FALCON_THEME_CUSTOM file when the theme.config.js exists
    if (fs.existsSync(themeCustomPath)) {
      FALCON_THEME_CUSTOM = `
export {default} from "${themeCustomPath.replace(/\\/g, '\\\\')}";
`
    }
  }
  return {FALCON_THEME, FALCON_THEME_CUSTOM}
}


function assertCustomThemePath(styleOpts, lessPaths)
{
  if (!styleOpts.themeCustom) return

  let found = false
  let tryPaths = []

  for (let path0 of lessPaths) {
    let tryPath = path.join(path0, styleOpts.themeCustom)
    tryPaths.push(tryPath)
  }

  for (let tryPath of tryPaths) {
    if (fs.existsSync(tryPath)) {
      found = true
      break
    }
  }
  if (!found) {
    log.warn(`WARNING: 请检查 options.themeCustom，路径不存在，尝试的路径：${tryPaths.join(', ')}`)
  }
}

function getTheme(styleOpts)
{
  const theme = styleOpts.theme || 'theme-default'
  const themeCustom = styleOpts.themeCustom || 'theme-custom'
  return {theme, themeCustom}
}

function getLessModifyVars(styleOpts)
{
  const {theme, themeCustom} = getTheme(styleOpts)
  return {theme, themeCustom}
}

function getLessPaths(styleOpts)
{
  let lessPaths = styleOpts['lessPaths'] || ['styles']
  lessPaths = lessPaths.map(item => path.resolve(appInfo.getAppRoot(), 'src', item))
  assertCustomThemePath(styleOpts, lessPaths)
  lessPaths.push(path.join(appInfo.getAppRoot(), 'node_modules'))
  return lessPaths
}

//获取mockapi模块列表
function getMockApi() {
  const mockApis = {};
  const mockApiDir = path.resolve(appInfo.getAppRoot(), 'api-mock');
  if (fs.existsSync(mockApiDir)) {
    const dirs = fs.readdirSync(mockApiDir);
    dirs.forEach((file) => {
      if (file.endsWith('js')) {
        let baseName = path.basename(file, '.js');
        if (baseName.startsWith('$jsapi.')) {
          baseName = baseName.replace('$jsapi.', '$jsapi/');
        }
        mockApis[baseName] = path.resolve(mockApiDir, file);
      }
    });
  }
  return mockApis;
}

module.exports = {
  getThemeImportSource,
  getLessPaths,
  getLessModifyVars,
  getMockApi,
}
