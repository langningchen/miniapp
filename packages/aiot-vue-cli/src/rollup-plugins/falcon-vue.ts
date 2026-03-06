/**
 * Rollup plugin for Weex/AIOT .vue single-file components.
 *
 * Virtual module ID strategy
 * ──────────────────────────────────────────────────────────────────────────
 *  SCRIPT  →  \0aiot-vue:script:/abs/path/file.vue
 *    \0 prefix = Rollup virtual module convention: skips filesystem lookup,
 *    opaque to all other plugins. Safe for JS content.
 *
 *  STYLE   →  /abs/path/file.vue?aiot-vue=style.0.css
 *    No \0 prefix. CSS/Less plugins use createFilter(['**\/*.css']) which
 *    matches on the ID string — they would be blind to a \0-prefixed ID.
 *    Our load() returns raw CSS; downstream plugins transform() it normally.
 *
 * scopeId
 * ──────────────────────────────────────────────────────────────────────────
 *  A deterministic hash derived from the .vue file's path, e.g. `data-v-3f8a2b`.
 *  The Vue runtime uses it to:
 *    1. Add a `[data-v-3f8a2b]` attribute scope to all CSS selectors compiled
 *       from <style scoped>, preventing styles from leaking across components.
 *    2. Stamp the same attribute onto every DOM element the component renders,
 *       so the scoped selectors actually match.
 *
 * Data flow (no side-channels)
 * ──────────────────────────────────────────────────────────────────────────
 *  transform()  – parses SFC, registers each block's source in a plain Map
 *                 keyed by its canonical virtual ID, returns assembled module.
 *  resolveId()  – recognises our virtual IDs and returns them as-is so Rollup
 *                 skips filesystem resolution; also fixes relative imports that
 *                 originate from inside a \0-prefixed script virtual module.
 *  load()       – retrieves pre-registered source from the Map.
 */

import { dirname, relative, resolve } from 'node:path';
import { createFilter } from '@rollup/pluginutils';
// Use the official SFC block types — no need to redeclare them ourselves.
import type { SFCScriptBlock, SFCStyleBlock, SFCTemplateBlock } from '@vue/compiler-sfc';
import type { Plugin } from 'rollup';
import transpile from 'vue-template-es2015-compiler';
import templateCompiler from 'weex-template-compiler';
import * as info from '../libs/appinfo.js';
import { getContent, md5 } from '../libs/helper.js';
import { vueParse } from '../libs/parser.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCRIPT_NS = '\0aiot-vue:script:';
const STYLE_QUERY_KEY = 'aiot-vue';
const STYLE_QUERY_RE = new RegExp(`[?&]${STYLE_QUERY_KEY}=style\\.(\\d+)\\.([a-z]+)`, 'i');

// ─── Local types ──────────────────────────────────────────────────────────────
// Only define what @vue/compiler-sfc doesn't already cover.

interface VueParts {
  template?: SFCTemplateBlock;
  script?: SFCScriptBlock;
  styles?: SFCStyleBlock[];
}

interface StyleDescriptor {
  virtualId: string;
  bindingName: string;
}

// ─── Virtual ID helpers ───────────────────────────────────────────────────────

const makeScriptId = (vueId: string) => `${SCRIPT_NS}${vueId}`;

const makeStyleId = (vueId: string, index: number, lang: string) =>
  `${vueId}?${STYLE_QUERY_KEY}=style.${index}.${lang}`;

const isScriptId = (id: string) => id.startsWith(SCRIPT_NS);
const isStyleId = (id: string) => STYLE_QUERY_RE.test(id);

// ─── Source resolution ────────────────────────────────────────────────────────

function resolveExternalSrc(src: string, importer: string): string {
  if (src.startsWith('.')) return resolve(dirname(importer), src);
  if (src.startsWith('@')) {
    const appSrc = resolve(info.getAppRoot(), 'src');
    return resolve(dirname(importer), src.replace('@', appSrc));
  }
  return require.resolve(src, { paths: [dirname(importer)] });
}

function readScriptSource(block: SFCScriptBlock | undefined, vueId: string): string {
  if (!block) return 'export default {};';
  if (block.src) return getContent(resolveExternalSrc(block.src, vueId));
  return block.content || 'export default {};';
}

function readStyleSource(block: SFCStyleBlock, vueId: string): string {
  if (block.src) return getContent(resolveExternalSrc(block.src, vueId));
  return block.content;
}

// ─── Template compilation ─────────────────────────────────────────────────────

function wrapRenderFn(body: string, isFunctional: boolean): string {
  return `function (${isFunctional ? '_h,_vm' : ''}){\n${body}}`;
}

/** Compiles a template block into transpiled render function declarations. */
function compileTemplate(block: SFCTemplateBlock, isFunctional: boolean): string {
  const compiled = templateCompiler.compile(block.content);

  const parts = [
    `let render = ${wrapRenderFn(compiled.render, isFunctional)};`,
    compiled['@render'] ? `"@render": ${wrapRenderFn(compiled['@render'], isFunctional)},` : '',
    `let staticRenderFns = [${compiled.staticRenderFns
      .map((fn: string) => wrapRenderFn(fn, isFunctional))
      .join(', ')}];`,
    'render._withStripped = true;',
  ]
    .filter(Boolean)
    .join('\n');

  return transpile(parts, { transforms: { stripWithFunctional: isFunctional } });
}

// ─── Style expression builders ────────────────────────────────────────────────

function buildStyleExpressions(bindings: string[]): string {
  if (!bindings.length) return '{}';
  return `Object.assign({}, ${bindings.map((b) => `${b}['_']`).join(', ')})`;
}

// ─── Sub-module registration ──────────────────────────────────────────────────

function registerScript(
  block: SFCScriptBlock | undefined,
  vueId: string,
  registry: Map<string, string>,
): string {
  const id = makeScriptId(vueId);
  registry.set(id, readScriptSource(block, vueId));
  return id;
}

function registerStyles(
  blocks: SFCStyleBlock[] | undefined,
  vueId: string,
  registry: Map<string, string>,
): StyleDescriptor[] {
  if (!blocks?.length) return [];

  return blocks.map((block, index) => {
    const lang = block.lang ?? 'css';
    const id = makeStyleId(vueId, index, lang);
    // Raw CSS/Less — downstream CSS plugins handle the transform().
    registry.set(id, readStyleSource(block, vueId));
    return { virtualId: id, bindingName: `__style_${index}__` };
  });
}

// ─── Module assembly ──────────────────────────────────────────────────────────

/**
 * Assembles the final ESM wrapper for a `.vue` file.
 *
 * ```js
 * import __script__  from '\0aiot-vue:script:/abs/file.vue';
 * import __style_0__ from '/abs/file.vue?aiot-vue=style.0.css';
 *
 * let render = ...;
 * let staticRenderFns = [];
 *
 * __script__.render = render;
 * __script__.style  = Object.assign({}, __style_0__['_']);
 * export default __script__;
 * ```
 */
function assembleModule(
  parts: VueParts,
  vueId: string,
  scopeId: string,
  scriptId: string,
  styleDescriptors: StyleDescriptor[],
): string {
  const isFunctional = !!parts.template?.attrs?.functional;
  const styleExpr = buildStyleExpressions(styleDescriptors.map((d) => d.bindingName));

  const sections: string[] = [
    // 1. Script (virtual, \0-prefixed)
    `import __script__ from ${JSON.stringify(scriptId)};`,

    // 2. Styles (virtual, query-string IDs — CSS plugins process these)
    ...styleDescriptors.map((d) => `import ${d.bindingName} from ${JSON.stringify(d.virtualId)};`),

    // 3. Render functions inlined (no extra virtual module round-trip)
    ...(parts.template ? [compileTemplate(parts.template, isFunctional)] : []),

    // 4. Component property assignments
    [
      isFunctional ? '__script__.functional = true;' : '',
      parts.template ? '__script__.render = render;' : '',
      parts.template ? '__script__.staticRenderFns = staticRenderFns;' : '',
      parts.template ? '__script__._compiled = true;' : '',
      `__script__._scopeId = ${JSON.stringify(scopeId)};`,
      `__script__.themes   = {};`,
      `__script__.style    = ${styleExpr};`,
      `__script__.__file   = ${JSON.stringify(info.pathToRootUnix(vueId))};`,
    ]
      .filter(Boolean)
      .join('\n'),

    // 5. Export
    'export default __script__;',
  ];

  return sections.filter(Boolean).join('\n\n');
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const VueTemplate = (): Plugin => {
  const filter = createFilter(['**/*.vue']);
  // Plain Map<string, string>: virtualId → source content.
  // Populated in transform(), consumed in load(). No class wrapper needed.
  const registry = new Map<string, string>();

  return {
    name: 'aiot-vue',

    resolveId(id, importer) {
      // Our virtual IDs are already fully resolved — return as-is.
      if (isScriptId(id) || isStyleId(id)) return id;

      // Relative imports inside a \0-prefixed script virtual module have no
      // real filesystem anchor. Extract the original .vue path and delegate.
      if (importer?.startsWith(SCRIPT_NS)) {
        const vueId = importer.slice(SCRIPT_NS.length);
        return this.resolve(id, vueId, { skipSelf: true });
      }

      return null;
    },

    load(id) {
      if (!isScriptId(id) && !isStyleId(id)) return null;

      const content = registry.get(id);
      if (content === undefined) {
        this.warn(`[aiot-vue] load: unregistered virtual ID "${id}"`);
        return null;
      }
      return content;
    },

    transform(code, id) {
      if (!filter(id)) return null;

      const parts = vueParse(code, id) as VueParts;
      const scopeId = `data-v-${md5(relative(process.cwd(), id))}`;

      const scriptId = registerScript(parts.script, id, registry);
      const styleDescriptors = registerStyles(parts.styles, id, registry);

      return assembleModule(parts, id, scopeId, scriptId, styleDescriptors);
    },
  } satisfies Plugin;
};

export default VueTemplate;
