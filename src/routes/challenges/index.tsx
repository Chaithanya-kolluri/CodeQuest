import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { DifficultyTag } from "@/components/RankBadge";
import { dailyChallenge, fetchChallenges } from "@/lib/challenges";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/challenges/")({
  head: () => ({
    meta: [
      { title: "Coding Challenges — CodeQuest" },
      {
        name: "description",
        content:
          "Browse every CodeQuest coding challenge, from warm-up loops to hard algorithm puzzles. Solve them in JavaScript or Python and earn XP.",
      },
      { property: "og:title", content: "Coding Challenges — CodeQuest" },
      {
        property: "og:description",
        content: "Easy to hard coding puzzles you solve in the browser in JavaScript or Python.",
      },
    ],
  }),
  component: ChallengesPage,
});

function ChallengesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["challenges"], queryFn: fetchChallenges });
  const daily = data ? dailyChallenge(data) : null;

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Challenges</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Write code, run the hidden tests, bank the XP. First clear on each challenge pays out.
        </p>

        <div className="mt-8 grid gap-3">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}

          {data?.map((challenge) => (
            <Link
              key={challenge.id}
              to="/challenges/$slug"
              params={{ slug: challenge.slug }}
              className="panel group flex items-center gap-4 p-4 transition-colors hover:border-primary/40"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {String(challenge.order_index).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-medium">{challenge.title}</h2>
                  <DifficultyTag difficulty={challenge.difficulty} />
                  {daily?.id === challenge.id && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
                      <CalendarDays className="size-3" /> DAILY
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {challenge.prompt}
                </p>
              </div>
              <span className="font-mono text-sm text-primary">+{challenge.xp_reward}</span>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}