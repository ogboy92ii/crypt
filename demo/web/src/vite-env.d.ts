/// <reference types="vite/client" />

// The wasm-bindgen glue of @tari-project/ootle-wasm-bor, loaded beside its `.wasm?init` (src/decode.ts).
declare module "@tari-project/ootle-wasm-bor/ootle_wasm_bor_bg.js" {
  export function __wbg_set_wasm(exports: WebAssembly.Exports): void;
  export function decodeSubstateValue(encoded: string): string;
  export function decodeExecuteResult(encoded: string): string;
}
