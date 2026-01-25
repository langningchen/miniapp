import { getAppEntryFile, getAppMeta, getAppPackageInfo, isSingleJsbundle } from '../libs/appinfo';
import type { Plugin } from 'rollup';
import { readFileSync } from 'fs';

const PROCESS_SUFFIX = '?needProcess';

const generatePagesImports = () => {
  const isSingle = isSingleJsbundle();
  if (!isSingle) return [];
  const meta = getAppMeta();
  if (!meta) throw new Error('Not initialized');
  return [
    'App.__pages = {};',
    ...Object.entries(meta.pages).flatMap(([page, path]) => [
      `import _${page} from './${path}';`,
      `App.__pages['${page}'] = _${page};`,
    ]),
  ];
};

export default (): Plugin => {
  const appFileId = getAppEntryFile();
  return {
    name: 'app',
    load: async (id) => {
      if (id.endsWith(PROCESS_SUFFIX)) return readFileSync(appFileId, 'utf-8');
    },
    transform: async (_code, id) => {
      if (id !== appFileId) return;
      const meta = getAppMeta();
      const pagesImports = generatePagesImports().join('\n');
      const packageInfo = getAppPackageInfo();
      const resultCode = `import App from './app.js${PROCESS_SUFFIX}';
App.meta = ${JSON.stringify(meta)};
App.meta.name = '${packageInfo.name}';
App.meta.version = '${packageInfo.version}';
App.meta.isSingleJsBundle = ${isSingleJsbundle() ? 'true' : 'false'};
$falcon.__AppClazz = App;
$falcon.__loadModuleDefault = async (fileName) => {
  if (App.__pages && App.__pages[fileName]){
    return App.__pages[fileName];
  } else {
    try {
      const pagePath = './' + fileName + '.js';
      const mod = await import(pagePath);
      return mod.default;
    } catch (e) {
      console.log(e.message, e.stack);
    }
  }
}

${pagesImports}`;
      return resultCode;
    },
  };
};
