import fs, { existsSync, readdirSync } from 'fs';
import path, { basename, extname, join, resolve } from 'path';
import { getAppRoot, type AppStyleOptions, type FileList } from './appinfo.js';
import consola from 'consola';

// theme
export function getThemeImportSource(styleOpts) {
  let FALCON_THEME = 'export default {}';
  let FALCON_THEME_CUSTOM = 'export default {}';
  let theme = styleOpts.theme || 'theme-default';
  let themeCustom = styleOpts.themeCustom || '';

  if (theme) {
    const themePath = path.resolve(
      join(getAppRoot(), 'node_modules/falcon-ui', `src/styles/${theme}/theme.config.js`),
    );
    if (!fs.existsSync(themePath)) {
      consola.warn(
        `WARNING: 找不到theme "${theme}"，请检查 falcon-ui 是否安装，路径：${themePath}`,
      );
    } else {
      FALCON_THEME = `
export {default} from "${themePath.replace(/\\/g, '\\\\')}";
`;
    }
  }
  if (themeCustom) {
    const themeCustomDir = path.resolve(
      path.join(appInfo.getAppRoot(), `src/styles/${themeCustom}`),
    );
    const themeCustomPath = path.join(themeCustomDir, `theme.config.js`);
    // always show warning if the themeCustom user specified is not exists
    if (styleOpts.themeCustom && !fs.existsSync(themeCustomDir)) {
      log.warn(`WARNING: 找不到自定义theme "${themeCustom}"，请检查路径：${themeCustomDir}`);
    }
    // then only generate FALCON_THEME_CUSTOM file when the theme.config.js exists
    if (fs.existsSync(themeCustomPath)) {
      FALCON_THEME_CUSTOM = `
export {default} from "${themeCustomPath.replace(/\\/g, '\\\\')}";
`;
    }
  }
  return { FALCON_THEME, FALCON_THEME_CUSTOM };
}

const assertCustomThemePath = (styleOpts: AppStyleOptions, lessPaths: string[]) => {
  if (!styleOpts.themeCustom) return;
  const paths = [];
  for (const path of lessPaths) paths.push(join(path, styleOpts.themeCustom));
  for (const path of paths) if (existsSync(path)) return;
  consola.warn(`请检查 options.themeCustom，路径不存在，尝试的路径：${paths.join(', ')}`);
};

export const getLessModifyVars = (styleOpts: AppStyleOptions) => {
  return {
    theme: styleOpts.theme || 'theme-default',
    themeCustom: styleOpts.themeCustom || 'theme-custom',
  };
};

export const getLessPaths = (styleOpts: AppStyleOptions) => {
  const lessPaths = (styleOpts.lessPaths || ['styles']).map((item) =>
    resolve(getAppRoot(), 'src', item),
  );
  assertCustomThemePath(styleOpts, lessPaths);
  lessPaths.push(join(getAppRoot(), 'node_modules'));
  return lessPaths;
};

export const getMockApi = () => {
  const mockApis: FileList = {};
  const mockApiDir = resolve(getAppRoot(), 'api-mock');
  if (existsSync(mockApiDir)) {
    const dirs = readdirSync(mockApiDir);
    dirs.forEach((file) => {
      if (file.endsWith('js') || file.endsWith('.ts')) {
        let baseName = basename(file, extname(file));
        if (baseName.startsWith('$jsapi.')) baseName = baseName.replace('$jsapi.', '$jsapi/');
        mockApis[baseName] = resolve(mockApiDir, file);
      }
    });
  }
  return mockApis;
};
