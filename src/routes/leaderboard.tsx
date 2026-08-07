import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Medal } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { RankPill } from "@/components/RankBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { levelFromXp } from "@/lib/ranks";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — CodeQuest Top Coders" },
      {
        name: "description",
        content:
          "See who is topping the CodeQuest leaderboard: total XP, level, rank and daily solving streaks.",
      },
      { property: "og:title", content: "CodeQuest Leaderboard" },
      {
        property: "og:description",
        content: "Global XP rankings for CodeQuest players.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Row = {
  id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  current_streak: number;
};

function LeaderboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, xp, current_streak")
        .order("xp", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (rows ?? []) as Row[];
    },
  });

  const medal = ["text-medium", "text-muted-foreground", "text-hard"];

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Leaderboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Top 50 coders by total XP earned.</p>

        <div className="panel mt-8 divide-y divide-border">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-6 w-full" />
              </div>
            ))}

          {data?.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No players yet — be the first on the board.
            </p>
          )}

          {data?.map((row, index) => (
            <div
              key={row.id}
              className={`flex items-center gap-4 p-4 ${row.id === user?.id ? "bg-primary/5" : ""}`}
            >
              <span className="w-8 shrink-0 text-center font-mono text-sm text-muted-foreground">
                {index < 3 ? (
                  <Medal className={`mx-auto size-4 ${medal[index]}`} />
                ) : (
                  index + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.username}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  Level {levelFromXp(row.xp)}
                </p>
              </div>
              <span className="hidden items-center gap-1 font-mono text-xs text-medium sm:inline-flex">
                <Flame className="size-3.5" />
                {row.current_streak}
              </span>
              <RankPill xp={row.xp} />
              <span className="w-20 text-right font-mono text-sm text-primary">{row.xp} XP</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}