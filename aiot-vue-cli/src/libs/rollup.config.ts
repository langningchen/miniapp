import { readFileSync } from 'fs';
import { resolve } from 'path';

import { nodeResolve } from '@rollup/plugin-node-resolve';
import pluginAlias from '@rollup/plugin-alias';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import pluginJson from '@rollup/plugin-json';
import pluginVirtual from '@rollup/plugin-virtual';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

import pluginVue from '../rollup-plugins/falcon-vue';
import styleJson from '../rollup-plugins/style-json';
import assetPlugin from '../rollup-plugins/asset';
import pluginImage from '../rollup-plugins/image';
import pluginApp from '../rollup-plugins/app';
import pluginFalconModule from '../rollup-plugins/falcon-module';
import { getThemeImportSource, getMockApi } from './common';
import {
  getAppMeta,
  getAppRoot,
  getFalconBuildDir,
  getInputs,
  type AppOptions,
  type AppStyleOptions,
} from './appinfo.js';
import type { BuildConfig } from '../steps/build.js';
import type { InputPluginOption, OutputOptions, RollupOptions } from 'rollup';

type StrictRollupOptions = RollupOptions & {
  plugins: InputPluginOption[];
};
interface RollupConfig {
  input: StrictRollupOptions;
  output: OutputOptions;
}

const generateCommonConfig = (appMetaOptions: AppOptions, options: BuildConfig): RollupConfig => {
  const styleOpts: AppStyleOptions = appMetaOptions.style || {};
  const mockSources: Record<string, string> = {};
  if (options.mock)
    for (const [key, value] of Object.entries(getMockApi()))
      mockSources[key] = readFileSync(value, 'utf8');
  const customAlias = [];
  const alias = appMetaOptions.alias;
  if (alias)
    for (const [key, path] of Object.entries(alias))
      customAlias.push({ find: key, replacement: resolve(getAppRoot(), path) });
  // TO-DO: why defineComponent is ignored?
  const replaceValues: Record<string, string> = { defineComponent: '' };
  if (options.env) {
    for (const item of options.env) {
      const parts = item.split('=');
      const key = parts[0]!.trim();
      const value = parts[1]?.trim();
      if (parts.length === 1) replaceValues[key] = 'true';
      else if (parts.length > 1) replaceValues[key] = JSON.stringify(value);
    }
  }
  const input: StrictRollupOptions = {
    external: ['vue', 'falcon-vue-render'],
    treeshake: {
      preset: 'smallest',
    },
    plugins: [
      pluginVirtual({
        ...getThemeImportSource(styleOpts),
        ...mockSources,
      }),
      nodeResolve(),
      commonjs(),
      typescript(),
      pluginApp(),
      pluginImage(),
      assetPlugin(),
      styleJson(appMetaOptions),
      pluginJson(),
      pluginVue(), //{ template: { optimizeSSR: false }, needMap: false, css: true }
      pluginAlias({
        entries: [{ find: '@', replacement: resolve(getAppRoot(), 'src') }, ...customAlias],
      }),
      replace({
        values: replaceValues,
        preventAssignment: true,
      }),
      pluginFalconModule(), // 把模块的插件放在最后,上面无法解析的 import 内容交给模块解析插件
    ],
  };

  const output: OutputOptions = {
    format: 'es',
    dir: getFalconBuildDir(),
    exports: 'auto',
    assetFileNames: 'assets/[name][extname]',
  };

  return { input, output };
};

export const getConfig = (options: BuildConfig): RollupConfig => {
  const appMeta = getAppMeta();
  const appMetaOptions = appMeta?.options || {};

  const { input, output } = generateCommonConfig(appMetaOptions, options);

  input.input = getInputs();
  if (options.minify) input.plugins.push(terser());

  return { input, output };
};
