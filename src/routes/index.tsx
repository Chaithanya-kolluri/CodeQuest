import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Flame, Terminal, Trophy } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { DifficultyTag } from "@/components/RankBadge";
import { Button } from "@/components/ui/button";
import { dailyChallenge, fetchChallenges } from "@/lib/challenges";
import { RANKS } from "@/lib/ranks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeQuest — Level Up With Daily Coding Challenges" },
      {
        name: "description",
        content:
          "Solve JavaScript and Python challenges in an online editor, earn XP, build streaks and climb from Bronze to Grandmaster on CodeQuest.",
      },
      { property: "og:title", content: "CodeQuest — Level Up With Daily Coding Challenges" },
      {
        property: "og:description",
        content:
          "An online code editor, daily challenges, XP levelling and global ranks for JavaScript and Python.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useQuery({ queryKey: ["challenges"], queryFn: fetchChallenges });
  const daily = data ? dailyChallenge(data) : null;

  return (
    <div className="min-h-screen">
      <AppNav />

      <main>
        <section className="hero-surface border-b border-border">
          <div className="mx-auto max-w-5xl px-4 py-24 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-xs text-muted-foreground">
              <Terminal className="size-3.5 text-primary" />
              run code · earn xp · rank up
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
              Turn practice into
              <span className="text-primary"> progress</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
              Write JavaScript or Python straight in the browser, run the hidden test suite, and
              bank XP toward your next level and rank.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/challenges">
                  Start solving <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/leaderboard">View leaderboard</Link>
              </Button>
            </div>
          </div>
        </section>

        {daily && (
          <section className="mx-auto max-w-5xl px-4 py-14">
            <div className="panel glow flex flex-wrap items-center gap-5 p-6">
              <span className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
                <CalendarDays className="size-3.5" /> TODAY'S CHALLENGE
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-medium">{daily.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{daily.prompt}</p>
              </div>
              <DifficultyTag difficulty={daily.difficulty} />
              <Button asChild>
                <Link to="/challenges/$slug" params={{ slug: daily.slug }}>
                  Solve it
                </Link>
              </Button>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-5xl px-4 pb-14">
          <div className="grid gap-4 sm:grid-cols-3">
            <Feature
              icon={<Terminal className="size-4 text-primary" />}
              title="Real online editor"
              body="Syntax highlighting, two languages and an in-browser sandbox that runs your tests instantly."
            />
            <Feature
              icon={<Flame className="size-4 text-medium" />}
              title="Daily streaks"
              body="A fresh challenge every day. Keep the streak alive and watch the XP compound."
            />
            <Feature
              icon={<Trophy className="size-4 text-easy" />}
              title="Levels & ranks"
              body="Every 250 XP is a level. Climb six rank tiers and hold your place on the global board."
            />
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="text-center text-sm font-mono uppercase tracking-widest text-muted-foreground">
              The ranks
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {RANKS.map((rank) => (
                <div
                  key={rank.name}
                  className="panel px-4 py-3 text-center"
                  style={{ borderColor: `color-mix(in oklch, ${rank.color} 40%, transparent)` }}
                >
                  <p className="font-display text-sm font-medium" style={{ color: rank.color }}>
                    {rank.name}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {rank.minXp}+ XP
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-border py-8 text-center font-mono text-xs text-muted-foreground">
          CodeQuest — practice, ranked.
        </footer>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex size-9 items-center justify-center rounded-md bg-surface-2">{icon}</div>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
