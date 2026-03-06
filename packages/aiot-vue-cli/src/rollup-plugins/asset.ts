import { basename } from 'node:path';

import { createFilter } from '@rollup/pluginutils';
import type { Plugin } from 'rollup';

const DEFAULT_INCLUDE = [
  /\.mp4$/,
  /\.mkv$/,
  /\.mov$/,
  /\.avi$/,
  /\.wmv$/,
  /\.flv$/,
  /\.f4v$/,
  /\.hlv$/,
  /\.webm$/,
];

interface AssetPluginOptions {
  publicPath?: string;
  include?: (string | RegExp)[];
  exclude?: (string | RegExp)[];
  emitFileName?: (name: string) => string;
  transform?: (url: string) => string;
}

export default function asset(opts: AssetPluginOptions = {}): Plugin {
  const {
    publicPath = '',
    emitFileName = (name) => name,
    transform = (url) => `export default ${url};`,
    include = DEFAULT_INCLUDE,
    exclude,
  } = opts;

  const filter = createFilter(include, exclude);
  const fileIds: string[] = [];
  const variables: string[] = [];

  return {
    name: 'aiot-asset',

    transform(code, id) {
      if (!filter(id)) return null;

      const fileId = this.emitFile({
        type: 'asset',
        name: emitFileName(basename(id)),
        source: code,
      });
      const variable = `__asset_${fileId}__`;

      fileIds.push(fileId);
      variables.push(variable);

      return { code: transform(`import.meta.${variable}`) };
    },

    resolveImportMeta(property) {
      if (!property) return null;
      const i = variables.indexOf(property);
      if (i < 0) return null;
      const fileId = fileIds[i];
      if (!fileId) return null;
      return JSON.stringify(publicPath + this.getFileName(fileId));
    },
  };
}
