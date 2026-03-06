import type { Plugin } from 'rollup';
import { getAppEntryFile, getAppJsonInfo, getAppPackageInfo } from '../libs/appinfo.js';
import * as helper from '../libs/helper.js';

const ORIGIN_SUFFIX = '?from=originapp.js';

function appPreprocess(): Plugin {
  const appFileId = getAppEntryFile();

  return {
    name: 'aiot-app',

    load(id) {
      if (id.endsWith(ORIGIN_SUFFIX)) {
        return helper.getContent(appFileId);
      }
      return null;
    },

    transform(_code, id) {
      if (id !== appFileId) return null;

      const meta = getAppJsonInfo();
      const packageInfo = getAppPackageInfo();

      return `
import App from './app.js${ORIGIN_SUFFIX}';
App.meta = ${JSON.stringify(meta, null, 2)};
App.meta.name = '${packageInfo.name}';
App.meta.version = '${packageInfo.version}';
App.meta.isSingleJsBundle = false;
$falcon.__AppClazz = App;
$falcon.__loadModuleDefault = async function (fileName) {
  if (App.__pages?.[fileName]) {
    return App.__pages[fileName];
  }
  try {
    const mod = await import('./' + fileName + '.js');
    return mod.default;
  } catch (e) {
    console.error(e.message, e.stack);
  }
};`.trim();
    },
  };
}

export default appPreprocess;
