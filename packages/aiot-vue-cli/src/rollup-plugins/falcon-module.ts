import { log } from '@clack/prompts';
import type { Plugin, RollupError } from 'rollup';
import * as appInfo from '../libs/appinfo.js';
import { state } from '../libs/share.js';

const JSAPI_RE = /^\$jsapi\/(.*)/;
const MODULE_NAME_RE = /^[0-9a-zA-Z_]+$/;

function formatError(err: RollupError): string {
  const lines: string[] = [`Build failed: ${err.message}`];
  if (err.plugin) lines.push(`  Plugin: ${err.plugin}`);
  if (err.id) lines.push(`  File: ${err.id}`);
  if (err.frame)
    lines.push(
      err.frame
        .split(/\r?\n/)
        .map((l) => `  ${l}`)
        .join('\n'),
    );
  if (err.stack)
    lines.push(
      err.stack
        .split('\n')
        .filter((l) => /^\s*at/.test(l))
        .map((l) => `  ${l}`)
        .join('\n'),
    );
  return lines.join('\n');
}

function falconModule(): Plugin {
  const internalModules = new Set<string>();

  return {
    name: 'aiot-falcon-module',

    resolveId(id, importer) {
      if (!importer) return null;
      if (JSAPI_RE.test(id)) return id;
      if (id.startsWith('.') || id.startsWith('/')) return null;

      internalModules.add(id);
      return { id, external: true };
    },

    load(id) {
      const match = JSAPI_RE.exec(id);
      if (!match) return null;

      const moduleName = match[1];
      if (moduleName && MODULE_NAME_RE.test(moduleName)) {
        return `export default $falcon.jsapi['${moduleName}']`;
      }

      log.error(`Invalid module name: ${moduleName}`);
      return `export default undefined`;
    },

    buildEnd(error) {
      if (error) {
        try {
          log.error(formatError(error));
        } catch {
          log.error(String(error));
        }
      }

      state.internalModules = [...internalModules];

      const deps = appInfo.getAppPackageInfo().dependencies ?? {};
      const externals = appInfo.getAppJsonInfo().options?.external ?? [];
      const required = [...internalModules].filter((m) => m in deps);
      const optional = [...internalModules].filter((m) => !(m in deps) && !externals.includes(m));

      if (required.length > 0) {
        const msg = `Please install the following dependencies: ${required.join(', ')}`;
        log.error(msg);
        throw new Error(msg);
      }
      if (optional.length > 0) {
        const msg = `The following modules are not found: ${optional.join(', ')}`;
        log.error(msg);
        throw new Error(msg);
      }
    },
  };
}

export default falconModule;
