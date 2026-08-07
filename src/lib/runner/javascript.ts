import { deepEqual, type CaseResult, type RunOutcome, type TestCase } from "./types";

const WORKER_SOURCE = `
self.onmessage = function (event) {
  var code = event.data.code;
  var cases = event.data.cases;
  var logs = [];
  var originalLog = console.log;
  console.log = function () {
    logs.push(Array.prototype.slice.call(arguments).map(String).join(" "));
  };
  try {
    var factory = new Function(code + "\\n;return typeof solve === 'function' ? solve : null;");
    var solve = factory();
    if (!solve) {
      self.postMessage({ error: "Define a function named solve(...)", logs: logs });
      return;
    }
    var results = [];
    for (var i = 0; i < cases.length; i++) {
      var c = cases[i];
      try {
        var actual = solve.apply(null, JSON.parse(JSON.stringify(c.args)));
        results.push({ index: i, actual: actual === undefined ? null : actual });
      } catch (err) {
        results.push({ index: i, actual: null, error: String(err && err.message ? err.message : err) });
      }
    }
    self.postMessage({ results: results, logs: logs });
  } catch (err) {
    self.postMessage({ error: String(err && err.message ? err.message : err), logs: logs });
  } finally {
    console.log = originalLog;
  }
};
`;

export function runJavaScript(
  code: string,
  cases: TestCase[],
  timeoutMs = 4000,
): Promise<RunOutcome & { logs: string[] }> {
  return new Promise((resolve) => {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    const finish = (outcome: RunOutcome & { logs: string[] }) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(outcome);
    };

    const timer = setTimeout(() => {
      finish({
        results: [],
        logs: [],
        error: `Execution timed out after ${timeoutMs / 1000}s — check for an infinite loop.`,
      });
    }, timeoutMs);

    worker.onerror = (event) => {
      finish({ results: [], logs: [], error: event.message || "Runtime error" });
    };

    worker.onmessage = (event) => {
      const data = event.data as {
        error?: string;
        logs?: string[];
        results?: { index: number; actual: unknown; error?: string }[];
      };
      if (data.error) {
        finish({ results: [], logs: data.logs ?? [], error: data.error });
        return;
      }
      const results: CaseResult[] = (data.results ?? []).map((raw) => {
        const testCase = cases[raw.index]!;
        return {
          args: testCase.args,
          expected: testCase.expected,
          actual: raw.error ? null : raw.actual,
          passed: !raw.error && deepEqual(raw.actual, testCase.expected),
          ...(raw.error ? { error: raw.error } : {}),
        };
      });
      finish({ results, logs: data.logs ?? [] });
    };

    worker.postMessage({ code, cases });
  });
}