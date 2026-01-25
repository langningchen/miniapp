import { relative, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { consola } from 'consola';

const APP_SOURCE_DIR = 'src';
const APP_JSON_FILE_NAME = 'app.json';
const APP_BUILD_FALCON_DIR = '.falcon_';
const BUILD_TEMP_FILE_DIR = '.falcon_tmp';
export const APP_ENTRY_FILE_NAME = 'app.js';

export const isWin = process.platform === 'win32';

const validateAppRoot = (appRoot: string | undefined, silent: boolean) => {
  if (!appRoot) return false;
  const valid =
    existsSync(resolve(appRoot, 'package.json')) &&
    existsSync(resolve(appRoot, APP_SOURCE_DIR, 'app.js'));
  if (!valid && !silent) consola.error(`"${resolve(appRoot)}"不是一个有效的应用目录!`);
  return valid;
};

export interface AppStyleOptions {
  lessPaths?: string[];
  theme?: string;
  themes?: string[];
  themeCustom?: string;
}
export interface AppOptions {
  style?: AppStyleOptions;
  alias?: FileList;
}
interface AppJson {
  pages: FileList;
  services?: FileList;
  providers?: FileList;
  options?: AppOptions;
  meta?: unknown;
  props?: unknown;
}
let _app_root: string | undefined;
let _app_meta: AppJson | undefined;

export const init = (root: string) => {
  _app_root = resolve(root);
  if (!validateAppRoot(_app_root, false)) return false;

  const appJsonPath = resolve(getAppSourceDir(), APP_JSON_FILE_NAME);
  if (!existsSync(appJsonPath)) return false;
  _app_meta = JSON.parse(readFileSync(appJsonPath, 'utf-8'));

  return true;
};

export const isInited = () => {
  return _app_root !== null;
};

export const isValidRoot = () => {
  return validateAppRoot(_app_root, true);
};
export const getAppRoot = () => {
  if (!_app_root) throw new Error('app info uninit!');
  return _app_root;
};
export const getAppSourceDir = () => {
  return resolve(getAppRoot(), APP_SOURCE_DIR);
};

export const getAppEntryFile = () => {
  return resolve(getAppSourceDir(), APP_ENTRY_FILE_NAME);
};

export const getFalconBuildDir = () => {
  return resolve(getAppRoot(), APP_BUILD_FALCON_DIR);
};

export const getServiceBuildDir = () => {
  return resolve(getAppRoot(), APP_BUILD_FALCON_DIR, 'services');
};

export const getProviderBuildDir = () => {
  return resolve(getAppRoot(), APP_BUILD_FALCON_DIR, 'providers');
};

export const getBuildTempFileDir = () => {
  return resolve(getAppRoot(), BUILD_TEMP_FILE_DIR);
};

export interface AppQuickJs {
  version?: string;
  bigNum?: boolean;
}
export interface AppPkgJson {
  appid?: string;
  name?: string;
  icon?: string;
  appName?: string;
  version?: string;
  scripts?: string[];
  'single-js-bundle'?: boolean;
  previewOptions?: {
    jsLoaders?: boolean;
  };
  quickjs?: AppQuickJs;
}
let _app_pkg_info: AppPkgJson | undefined;
export const getAppPackageInfo = () => {
  if (!_app_pkg_info) {
    const pkgPath = resolve(getAppRoot(), 'package.json');
    if (existsSync(pkgPath)) {
      _app_pkg_info = JSON.parse(readFileSync(pkgPath, 'utf-8')) as AppPkgJson;
    } else {
      _app_pkg_info = {};
    }
    _app_pkg_info.scripts;
  }
  return _app_pkg_info;
};

export const getAppMeta = () => {
  if (!_app_meta) throw new Error('没有初始化');
  return _app_meta;
};

export const getPreviewOptions = () => {
  const pkgInfo = getAppPackageInfo();
  return pkgInfo.previewOptions || {};
};

export const getAppid = () => {
  const packageInfo = getAppPackageInfo();
  return packageInfo.appid;
};

export const getAmrPath = () => {
  const packageInfo = getAppPackageInfo();
  const DIST_DIR = getAppRoot();
  const DIST_FILE_BASE_NAME = packageInfo.appid
    ? packageInfo.appid
    : packageInfo.name
      ? packageInfo.name
      : 'dist';
  const DIST_VERSION = (packageInfo.version ?? '0.0.0').replace('.', '_');
  const DIST_FILE = resolve(DIST_DIR, `${DIST_FILE_BASE_NAME}.${DIST_VERSION}.amr`);
  return DIST_FILE;
};

let _isSingleJsbundle: boolean | undefined;
export const isSingleJsbundle = (): boolean => {
  if (_isSingleJsbundle === undefined) {
    const packageInfo = getAppPackageInfo();
    if (packageInfo['single-js-bundle'] === true) {
      _isSingleJsbundle = true;
    } else {
      const meta = getAppMeta();
      if (!meta) throw new Error('Not initialized');
      const pages = meta.pages;
      _isSingleJsbundle = Object.keys(pages).length === 1;
    }
  }
  return _isSingleJsbundle;
};

export type FileList = Record<string, string>;

export function getInputs(): FileList {
  const input: FileList = {};
  input.app = pathResolve(APP_SOURCE_DIR, APP_ENTRY_FILE_NAME);
  const isSingle = isSingleJsbundle();
  if (!isSingle) {
    const meta = getAppMeta();
    if (!meta) throw new Error('Not initialized');
    for (const [key, page] of Object.entries(meta.pages)) {
      if (input[key]) throw new Error(`Duplicate page name: ${key}`);
      input[key] = pathResolve(APP_SOURCE_DIR, page);
    }
  }
  Object.assign(input, getServiceInputs());
  Object.assign(input, getProviderInputs());
  return input;
}

export const getServiceInputs = (): FileList => {
  const meta = getAppMeta();
  if (!meta) throw new Error('Not initialized');
  const items = meta.services;
  if (!items) return {};
  const input: FileList = {};
  for (const [key, path] of Object.entries(items)) {
    if (input[key]) throw new Error(`Duplicate service name: ${key}`);
    input[`services/${key}`] = pathResolve(APP_SOURCE_DIR, path);
  }
  return input;
};

export const getProviderInputs = (): FileList => {
  const meta = getAppMeta();
  if (!meta) throw new Error('Not initialized');
  const items = meta.providers;
  if (!items) return {};
  const input: FileList = {};
  for (const [key, path] of Object.entries(items)) {
    if (input[key]) throw new Error(`Duplicate provider name: ${key}`);
    input[`providers/${key}`] = pathResolve(APP_SOURCE_DIR, path);
  }
  return input;
};

export const pathToRoot = (target: string) => {
  return relative(getAppRoot(), target);
};
export const pathToRootUnix = (target: string) => {
  return relative(getAppRoot(), target).replace(/\\/g, '/');
};

export const pathResolve = (...target: string[]) => {
  return resolve(getAppRoot(), ...target);
};
