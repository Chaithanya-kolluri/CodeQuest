import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Play, RotateCcw, XCircle } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { CodeEditor, type EditorLanguage } from "@/components/CodeEditor";
import { DifficultyTag } from "@/components/RankBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { fetchChallenge } from "@/lib/challenges";
import { runJavaScript } from "@/lib/runner/javascript";
import { runPython } from "@/lib/runner/python";
import type { CaseResult } from "@/lib/runner/types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/challenges/$slug")({
  head: ({ params }) => {
    const name = params.slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${name} — CodeQuest Challenge` },
        {
          name: "description",
          content: `Solve the ${name} coding challenge in JavaScript or Python, run the tests in the browser and earn XP on CodeQuest.`,
        },
        { property: "og:title", content: `${name} — CodeQuest Challenge` },
        {
          property: "og:description",
          content: `Solve ${name} in the online editor and climb the CodeQuest ranks.`,
        },
      ],
    };
  },
  component: ChallengePage,
});

function formatValue(value: unknown) {
  return JSON.stringify(value ?? null);
}

function ChallengePage() {
  const { slug } = useParams({ from: "/challenges/$slug" });
  const { user, refreshProfile } = useAuth();
  const { data: challenge, isLoading } = useQuery({
    queryKey: ["challenge", slug],
    queryFn: () => fetchChallenge(slug),
  });

  const [language, setLanguage] = useState<EditorLanguage>("javascript");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CaseResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);

  const starter = useMemo(() => {
    if (!challenge) return "";
    return language === "python" ? challenge.starter_py : challenge.starter_js;
  }, [challenge, language]);

  useEffect(() => {
    setCode(starter);
    setResults(null);
    setError(null);
    setLogs([]);
  }, [starter]);

  useEffect(() => {
    if (!user || !challenge) return;
    void supabase
      .from("submissions")
      .select("id")
      .eq("user_id", user.id)
      .eq("challenge_id", challenge.id)
      .eq("passed", true)
      .limit(1)
      .then(({ data }) => setSolved((data ?? []).length > 0));
  }, [user, challenge]);

  const handleRun = async () => {
    if (!challenge) return;
    setRunning(true);
    setError(null);
    setResults(null);
    const cases = challenge.tests.cases;
    const outcome =
      language === "python" ? await runPython(code, cases) : await runJavaScript(code, cases);
    setRunning(false);
    setLogs(outcome.logs);

    if (outcome.error) {
      setError(outcome.error);
      return;
    }
    setResults(outcome.results);

    const allPassed = outcome.results.length > 0 && outcome.results.every((r) => r.passed);
    if (!allPassed) {
      toast.error("Some tests failed — keep going.");
      return;
    }

    if (!user) {
      toast.success("All tests passed! Sign in to bank the XP.");
      return;
    }

    const alreadySolved = solved;
    const { error: insertError } = await supabase.from("submissions").insert({
      user_id: user.id,
      challenge_id: challenge.id,
      language,
      code,
      passed: true,
    });
    if (insertError) {
      toast.error("Solved, but the score could not be saved.");
      return;
    }
    setSolved(true);
    await refreshProfile();
    toast.success(
      alreadySolved
        ? "Solved again — no extra XP this time."
        : `Challenge cleared! +${challenge.xp_reward} XP`,
    );
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {isLoading && <Skeleton className="h-96 w-full" />}
        {!isLoading && !challenge && (
          <div className="panel p-8 text-center">
            <p className="text-muted-foreground">That challenge doesn't exist.</p>
            <Button asChild className="mt-4">
              <Link to="/challenges">Back to challenges</Link>
            </Button>
          </div>
        )}

        {challenge && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="panel p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <DifficultyTag difficulty={challenge.difficulty} />
                  <span className="font-mono text-xs text-primary">
                    +{challenge.xp_reward} XP
                  </span>
                  {solved && (
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-success">
                      <CheckCircle2 className="size-3.5" /> solved
                    </span>
                  )}
                </div>
                <h1 className="mt-3 text-2xl font-semibold">{challenge.title}</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {challenge.prompt}
                </p>
                <p className="mt-4 rounded-md bg-surface-2 p-3 font-mono text-xs text-muted-foreground">
                  Your function must be named <span className="text-primary">solve</span>.
                </p>
              </div>

              <div className="panel p-5">
                <h2 className="text-sm font-medium">Sample cases</h2>
                <ul className="mt-3 space-y-2 font-mono text-xs text-muted-foreground">
                  {challenge.tests.cases.slice(0, 2).map((testCase, i) => (
                    <li key={i} className="rounded-md bg-surface-2 p-2">
                      solve({testCase.args.map(formatValue).join(", ")}) →{" "}
                      <span className="text-foreground">{formatValue(testCase.expected)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-border p-1">
                  {(["javascript", "python"] as EditorLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                        language === lang
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lang === "javascript" ? "JavaScript" : "Python"}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCode(starter)}>
                  <RotateCcw className="size-4" /> Reset
                </Button>
                <Button className="ml-auto" onClick={handleRun} disabled={running}>
                  {running ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Run tests
                </Button>
              </div>

              <CodeEditor value={code} language={language} onChange={setCode} />

              <div className="panel p-4">
                <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  Output
                </h2>
                {running && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {language === "python"
                      ? "Booting the Python runtime (first run takes a few seconds)…"
                      : "Running tests…"}
                  </p>
                )}
                {!running && error && (
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md bg-destructive/10 p-3 font-mono text-xs text-destructive">
                    {error}
                  </pre>
                )}
                {!running && !error && !results && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Run the tests to see your results.
                  </p>
                )}
                {!running && results && (
                  <ul className="mt-3 space-y-2">
                    {results.map((result, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-md bg-surface-2 p-3 font-mono text-xs"
                      >
                        {result.passed ? (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                        ) : (
                          <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                        )}
                        <div className="min-w-0">
                          <p className="text-muted-foreground">
                            solve({result.args.map(formatValue).join(", ")})
                          </p>
                          <p>
                            expected{" "}
                            <span className="text-success">{formatValue(result.expected)}</span>
                            {" · got "}
                            <span className={result.passed ? "text-success" : "text-destructive"}>
                              {result.error ?? formatValue(result.actual)}
                            </span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {logs.length > 0 && (
                  <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-surface-2 p-3 font-mono text-xs text-muted-foreground">
                    {logs.join("\n")}
                  </pre>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}