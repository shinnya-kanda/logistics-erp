import { useEffect, useState } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

/**
 * 初回 getSession + onAuthStateChange で session / user を追跡。
 */
export function useAuthSession(client: SupabaseClient): {
  session: Session | null;
  user: User | null;
  loading: boolean;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[admin-dashboard/auth] getSession", error);
          setSession(null);
        } else {
          setSession(data.session);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("[admin-dashboard/auth] getSession", e);
          setSession(null);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [client]);

  const user = session?.user ?? null;

  return { session, user, loading };
}
