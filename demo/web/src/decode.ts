/**
 * From Ootle 0.48 the indexer serves engine values as their CBOR bytes, base64 in the JSON
 * (tari-ootle #3101): a substate under `state.up.substate`, a transaction's result under
 * `execution_result`. The official decoder turns one back into the serde JSON the indexer used to
 * send, so the page reads both shapes the same way. The wasm only loads when a value needs it.
 */

type Decoder = (encoded: string) => string;
interface Decoders { substate: Decoder; result: Decoder }

// Which decoder reads the base64 string under each key.
const KEYS: Record<string, keyof Decoders> = { substate: "substate", value: "substate", execution_result: "result", execute_result: "result" };
const BASE64 = /^[A-Za-z0-9+/]{8,}={0,2}$/;
const HEX = /^[0-9a-f]+$/;

const encoded = (key: string, v: unknown): v is string => key in KEYS && typeof v === "string" && BASE64.test(v) && !HEX.test(v);

function needsDecoding(v: unknown): boolean {
  if (Array.isArray(v)) return v.some(needsDecoding);
  if (v === null || typeof v !== "object") return false;
  return Object.entries(v).some(([k, x]) => encoded(k, x) || needsDecoding(x));
}

function decodeIn(v: unknown, d: Decoders): unknown {
  if (Array.isArray(v)) return v.map((x) => decodeIn(x, d));
  if (v === null || typeof v !== "object") return v;
  return Object.fromEntries(
    Object.entries(v).map(([k, x]) => {
      if (!encoded(k, x)) return [k, decodeIn(x, d)];
      try {
        return [k, JSON.parse(d[KEYS[k]](x))];
      } catch {
        return [k, x]; // base64-shaped but not an engine value: leave it as it came
      }
    }),
  );
}

let loading: Promise<Decoders> | undefined;

// The package is built for bundlers (`import * as wasm from "….wasm"`); Vite's `?init` instantiates
// the module with the glue's imports instead, so no wasm plugin or top-level await is needed.
async function load(): Promise<Decoders> {
  const [{ default: init }, glue] = await Promise.all([
    import("@tari-project/ootle-wasm-bor/ootle_wasm_bor_bg.wasm?init"),
    import("@tari-project/ootle-wasm-bor/ootle_wasm_bor_bg.js"),
  ]);
  const instance = await init({ "./ootle_wasm_bor_bg.js": glue as unknown as WebAssembly.ModuleImports });
  glue.__wbg_set_wasm(instance.exports);
  (instance.exports.__wbindgen_start as () => void)();
  return { substate: glue.decodeSubstateValue, result: glue.decodeExecuteResult };
}

/** `v` with every CBOR-encoded engine value replaced by its JSON. Unchanged when there is none. */
export async function readable<T>(v: T): Promise<T> {
  if (!needsDecoding(v)) return v;
  loading ??= load();
  return decodeIn(v, await loading) as T;
}
