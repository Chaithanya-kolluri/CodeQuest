import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_solved_on: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function fallbackUsername(user: User) {
  const meta = user.user_metadata as { username?: string; full_name?: string; name?: string };
  return (
    meta.username ??
    meta.full_name ??
    meta.name ??
    user.email?.split("@")[0] ??
    `player_${user.id.slice(0, 6)}`
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (user: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, xp, current_streak, longest_streak, last_solved_on")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
      return;
    }

    const meta = user.user_metadata as { avatar_url?: string; picture?: string };
    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username: fallbackUsername(user),
        avatar_url: meta.avatar_url ?? meta.picture ?? null,
      })
      .select("id, username, avatar_url, xp, current_streak, longest_streak, last_solved_on")
      .maybeSingle();
    setProfile((created as Profile) ?? null);
  };

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setTimeout(() => {
        void loadProfile(nextSession.user).finally(() => active && setLoading(false));
      }, 0);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (!data.session?.user) {
        setLoading(false);
        return;
      }
      void loadProfile(data.session.user).finally(() => active && setLoading(false));
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}