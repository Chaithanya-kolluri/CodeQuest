import { supabase } from "@/integrations/supabase/client";
import type { TestCase } from "./runner/types";

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  difficulty: "easy" | "medium" | "hard";
  xp_reward: number;
  starter_js: string;
  starter_py: string;
  tests: { cases: TestCase[] };
  order_index: number;
};

export async function fetchChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Challenge[];
}

export async function fetchChallenge(slug: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Challenge) ?? null;
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Deterministic daily pick: everyone gets the same challenge on the same day. */
export function dailyChallenge(challenges: Challenge[], date = new Date()): Challenge | null {
  if (challenges.length === 0) return null;
  const key = todayKey(date);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  return challenges[hash % challenges.length] ?? null;
}