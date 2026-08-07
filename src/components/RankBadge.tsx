import { levelFromXp, levelProgress, nextRank, rankFromXp } from "@/lib/ranks";

export function RankPill({ xp, className = "" }: { xp: number; className?: string }) {
  const rank = rankFromXp(xp);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs ${className}`}
      style={{ borderColor: rank.color, color: rank.color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: rank.color }} />
      {rank.name}
    </span>
  );
}

export function XpMeter({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const level = levelFromXp(xp);
  const progress = levelProgress(xp);
  const upcoming = nextRank(xp);

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-mono text-muted-foreground">
          LVL <span className="text-foreground">{level}</span>
        </span>
        <span className="font-mono text-muted-foreground">
          {progress.into}/{progress.needed} XP
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="xp-fill h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(progress.percent, 3)}%` }}
        />
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-muted-foreground">
          {upcoming
            ? `${upcoming.minXp - xp} XP to ${upcoming.name}`
            : "Max rank reached — Grandmaster"}
        </p>
      )}
    </div>
  );
}

export function DifficultyTag({ difficulty }: { difficulty: string }) {
  const map: Record<string, string> = {
    easy: "text-easy border-easy/40 bg-easy/10",
    medium: "text-medium border-medium/40 bg-medium/10",
    hard: "text-hard border-hard/40 bg-hard/10",
  };
  return (
    <span
      className={`rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${map[difficulty] ?? map["easy"]}`}
    >
      {difficulty}
    </span>
  );
}