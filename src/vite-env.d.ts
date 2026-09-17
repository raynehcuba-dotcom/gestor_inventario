declare module '*.wasm?url' {
  const url: string;
  export default url;
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const url: string;
  export default url;
}

declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }
  
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string): QueryExecutionResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }
  
  export interface Statement {
    bind(params?: any[]): void;
    step(): boolean;
    getAsObject(): ParamsObject;
    free(): void;
  }
  
  export interface QueryExecutionResult {
    columns: string[];
    values: any[][];
  }
  
  export interface ParamsObject {
    [key: string]: any;
  }
  
  export interface SqlJsInitOptions {
    locateFile?: (file: string) => string;
  }
  
  export default function initSqlJs(options?: SqlJsInitOptions): Promise<SqlJsStatic>;
}
