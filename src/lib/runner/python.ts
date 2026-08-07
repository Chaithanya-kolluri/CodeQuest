import { deepEqual, type CaseResult, type RunOutcome, type TestCase } from "./types";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type Pyodide = {
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => ((payload: string) => string) | undefined };
  setStdout: (options: { batched: (text: string) => void }) => void;
};

let pyodidePromise: Promise<Pyodide> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the Python runtime"));
    document.head.appendChild(script);
  });
}

export function loadPyodideRuntime(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await loadScript(`${PYODIDE_URL}pyodide.js`);
      const factory = (
        window as unknown as {
          loadPyodide: (options: { indexURL: string }) => Promise<Pyodide>;
        }
      ).loadPyodide;
      return factory({ indexURL: PYODIDE_URL });
    })().catch((error) => {
      pyodidePromise = null;
      throw error;
    });
  }
  return pyodidePromise;
}

const HARNESS = `
import json, traceback

def __lovable_run(payload):
    data = json.loads(payload)
    out = []
    if "solve" not in globals() or not callable(globals()["solve"]):
        return json.dumps({"error": "Define a function named solve(...)"})
    fn = globals()["solve"]
    for case in data:
        try:
            out.append({"ok": True, "value": fn(*case["args"])})
        except Exception as exc:
            out.append({"ok": False, "value": str(exc) or exc.__class__.__name__})
    return json.dumps({"results": out}, default=str)
`;

export async function runPython(
  code: string,
  cases: TestCase[],
): Promise<RunOutcome & { logs: string[] }> {
  const logs: string[] = [];
  let pyodide: Pyodide;
  try {
    pyodide = await loadPyodideRuntime();
  } catch {
    return { results: [], logs, error: "Could not load the Python runtime. Check your connection." };
  }

  try {
    pyodide.setStdout({ batched: (text) => logs.push(text) });
  } catch {
    /* stdout capture is best-effort */
  }

  try {
    pyodide.runPython(code);
    pyodide.runPython(HARNESS);
    const runner = pyodide.globals.get("__lovable_run");
    if (!runner) return { results: [], logs, error: "Python harness failed to initialise." };
    const raw = runner(JSON.stringify(cases));
    const parsed = JSON.parse(raw) as {
      error?: string;
      results?: { ok: boolean; value: unknown }[];
    };
    if (parsed.error) return { results: [], logs, error: parsed.error };
    const results: CaseResult[] = (parsed.results ?? []).map((raw2, index) => {
      const testCase = cases[index]!;
      return {
        args: testCase.args,
        expected: testCase.expected,
        actual: raw2.ok ? raw2.value : null,
        passed: raw2.ok && deepEqual(raw2.value, testCase.expected),
        ...(raw2.ok ? {} : { error: String(raw2.value) }),
      };
    });
    return { results, logs };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { results: [], logs, error: message.split("\n").slice(-6).join("\n") };
  }
}