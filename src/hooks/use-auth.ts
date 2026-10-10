import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

let state: AuthState = { session: null, user: null, profile: null, loading: true };
const listeners = new Set<(s: AuthState) => void>();
let initialized = false;

const setState = (patch: Partial<AuthState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
};

const fetchProfile = async (uid: string) => {
  const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  setState({ profile: (data as Profile | null) ?? null });
};

const init = () => {
  if (initialized) return;
  initialized = true;

  // 1) Hidrata sesión desde localStorage de inmediato (evita parpadeo "no logueado")
  supabase.auth.getSession().then(({ data: { session } }) => {
    setState({
      session,
      user: session?.user ?? null,
      loading: false,
    });
    if (session?.user) fetchProfile(session.user.id);
  });

  // 2) Suscríbete a cambios posteriores
  supabase.auth.onAuthStateChange((event, s) => {
    if (event === "TOKEN_REFRESHED") {
      setState({ session: s });
      return;
    }
    setState({
      session: s,
      user: s?.user ?? null,
      profile: s ? state.profile : null,
      loading: false,
    });
    if (s?.user) setTimeout(() => fetchProfile(s.user.id), 0);
  });
};

export function useAuth() {
  const [snap, setSnap] = useState<AuthState>(state);
  useEffect(() => {
    init();
    listeners.add(setSnap);
    setSnap(state);
    return () => { listeners.delete(setSnap); };
  }, []);
  return {
    ...snap,
    setProfile: (p: Profile | null) => setState({ profile: p }),
  };
}
