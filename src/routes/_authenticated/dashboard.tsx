import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Flame, Trophy, XCircle } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { RankPill, XpMeter } from "@/components/RankBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { levelFromXp } from "@/lib/ranks";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — CodeQuest" },
      {
        name: "description",
        content:
          "Track your CodeQuest XP, level, rank, daily streak and recent challenge submissions in one place.",
      },
      { property: "og:title", content: "Your CodeQuest Dashboard" },
      {
        property: "og:description",
        content: "XP, rank, streak and submission history for your CodeQuest account.",
      },
    ],
  }),
  component: DashboardPage,
});

type SubmissionRow = {
  id: string;
  passed: boolean;
  language: string;
  created_at: string;
  challenges: { title: string; slug: string } | null;
};

function DashboardPage() {
  const { user, profile } = useAuth();

  const { data: submissions, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, passed, language, created_at, challenges(title, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as unknown as SubmissionRow[];
    },
  });

  const xp = profile?.xp ?? 0;

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{profile?.username ?? "Coder"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Level {levelFromXp(xp)}</p>
          </div>
          <RankPill xp={xp} />
        </div>

        <div className="panel mt-6 p-5">
          <XpMeter xp={xp} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Trophy className="size-4 text-primary" />}
            label="Total XP"
            value={xp}
          />
          <StatCard
            icon={<Flame className="size-4 text-medium" />}
            label="Current streak"
            value={`${profile?.current_streak ?? 0} days`}
          />
          <StatCard
            icon={<CheckCircle2 className="size-4 text-success" />}
            label="Challenges solved"
            value={profile?.solved_count ?? 0}
          />
        </div>

        <h2 className="mt-10 text-lg font-medium">Recent submissions</h2>
        <div className="panel mt-3 divide-y divide-border">
          {isLoading && (
            <div className="p-4">
              <Skeleton className="h-6 w-full" />
            </div>
          )}
          {!isLoading && submissions?.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
              <Button asChild className="mt-4">
                <Link to="/challenges">Solve your first challenge</Link>
              </Button>
            </div>
          )}
          {submissions?.map((submission) => (
            <div key={submission.id} className="flex items-center gap-3 p-4">
              {submission.passed ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
              <span className="flex-1 truncate text-sm">
                {submission.challenges?.title ?? "Challenge"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {submission.language}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(submission.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-mono text-2xl">{value}</p>
    </div>
  );
}