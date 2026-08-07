export type TestCase = { args: unknown[]; expected: unknown };

export type CaseResult = {
  args: unknown[];
  expected: unknown;
  actual: unknown;
  passed: boolean;
  error?: string;
};

export type RunOutcome = {
  results: CaseResult[];
  error?: string;
};

export function deepEqual(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}