import { Link, useNavigate } from "@tanstack/react-router";
import { Code2, Flame, LogOut, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RankPill } from "@/components/RankBadge";
import { Button } from "@/components/ui/button";

export function AppNav() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary/15 text-primary">
            <Code2 className="size-4" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">CodeQuest</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
          <Link
            to="/challenges"
            className="rounded-md px-3 py-1.5 transition-colors hover:bg-secondary hover:text-foreground [&.active]:text-foreground"
          >
            Challenges
          </Link>
          <Link
            to="/leaderboard"
            className="rounded-md px-3 py-1.5 transition-colors hover:bg-secondary hover:text-foreground [&.active]:text-foreground"
          >
            Leaderboard
          </Link>
          {user && (
            <Link
              to="/dashboard"
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-secondary hover:text-foreground [&.active]:text-foreground"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              {profile && (
                <div className="hidden items-center gap-3 sm:flex">
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-medium">
                    <Flame className="size-3.5" />
                    {profile.current_streak}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    <Trophy className="size-3.5" />
                    {profile.xp} XP
                  </span>
                  <RankPill xp={profile.xp} />
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  void navigate({ to: "/", replace: true });
                }}
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}