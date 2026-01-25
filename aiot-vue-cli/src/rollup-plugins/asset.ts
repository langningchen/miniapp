import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import { readFileSync } from 'fs';
import { basename } from 'path';
import type { Plugin } from 'rollup';

interface AssetOptions {
  publicPath?: string;
  exclude?: FilterPattern;
  include?: FilterPattern;
  emitFileName?: (name: string) => string;
  transform?: (url: string) => string;
}

export default ({
  publicPath = '',
  exclude,
  include,
  emitFileName = (name) => name,
  transform = (url) => `export default ${url};`,
}: AssetOptions = {}): Plugin => {
  const filter = createFilter(include || [/\.(mp4|mkv|mov|avi|wmv|flv|f4v|hlv|webm)$/i], exclude);
  const assetFiles = new Map<string, string>();

  return {
    name: 'asset',
    transform(_code, id) {
      if (!filter(id)) return null;
      const fileId = this.emitFile({
        type: 'asset',
        name: emitFileName(basename(id)),
        source: readFileSync(id),
      });
      const placeholder = `__asset_${fileId}__`;
      assetFiles.set(placeholder, fileId);
      return { code: transform(`import.meta.${placeholder}`) };
    },
    resolveImportMeta(property) {
      if (!property) return null;
      const fileId = assetFiles.get(property);
      if (!fileId) return null;
      return JSON.stringify(`${publicPath}${this.getFileName(fileId)}`);
    },
  };
};
