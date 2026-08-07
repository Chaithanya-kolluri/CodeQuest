export type Rank = {
  name: string;
  minXp: number;
  color: string;
};

export const RANKS: Rank[] = [
  { name: "Bronze", minXp: 0, color: "oklch(0.72 0.11 60)" },
  { name: "Silver", minXp: 400, color: "oklch(0.82 0.02 250)" },
  { name: "Gold", minXp: 1000, color: "oklch(0.85 0.15 90)" },
  { name: "Platinum", minXp: 2000, color: "oklch(0.85 0.09 190)" },
  { name: "Diamond", minXp: 3500, color: "oklch(0.8 0.14 210)" },
  { name: "Master", minXp: 6000, color: "oklch(0.75 0.16 155)" },
  { name: "Grandmaster", minXp: 10000, color: "oklch(0.68 0.19 20)" },
];

export const XP_PER_LEVEL = 250;

export function levelFromXp(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function levelProgress(xp: number) {
  const into = xp % XP_PER_LEVEL;
  return {
    into,
    needed: XP_PER_LEVEL,
    percent: Math.round((into / XP_PER_LEVEL) * 100),
  };
}

export function rankFromXp(xp: number): Rank {
  let current = RANKS[0]!;
  for (const rank of RANKS) {
    if (xp >= rank.minXp) current = rank;
  }
  return current;
}

export function nextRank(xp: number): Rank | null {
  return RANKS.find((r) => r.minXp > xp) ?? null;
}