declare module 'vue-template-es2015-compiler' {
  interface TranspileOptions {
    transforms?: {
      stripWithFunctional?: boolean;
      [key: string]: unknown;
    };
  }
  function transpile(code: string, options?: TranspileOptions): string;
  export default transpile;
}

declare module 'weex-template-compiler' {
  interface CompileResult {
    render:          string;
    staticRenderFns: string[];
    '@render'?:      string;
    errors?:         string[];
    tips?:           string[];
  }
  function compile(template: string): CompileResult;
  export default { compile };
}

declare module 'falcon-styler' {
  interface StylerLogItem {
    line:   number;
    column: number;
    reason: string;
  }
  interface StylerResult {
    log:        StylerLogItem[];
    jsonStyle:  Record<string, Record<string, string>>;
  }
  function parse(input: string, callback: (err: unknown, result: StylerResult) => void): void;
  export default { parse };
}

declare module 'aiot-qjsc-tool/libs/qjsc.js' {
  interface QjscCompileOptions {
    version?:  string;
    bigNum?:   boolean;
    module?:   boolean;
    internal?: string[];
  }
  function compileJs(input: string, output: string, options?: QjscCompileOptions): Promise<boolean>;
  export { compileJs };
}
