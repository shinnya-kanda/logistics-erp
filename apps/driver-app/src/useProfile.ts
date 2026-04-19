import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  status: string;
};

export function useProfile(
  client: SupabaseClient,
  userId: string | null
): {
  profile: ProfileRow | null;
  loading: boolean;
  error: string | null;
} {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const { data, error: qErr } = await client
          .from("profiles")
          .select("id, email, display_name, status")
          .eq("id", userId)
          .maybeSingle();

        if (cancelled) return;
        if (qErr) {
          console.error("[profile] select", qErr);
          setError(qErr.message);
          setProfile(null);
        } else {
          setProfile(data as ProfileRow | null);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          console.error("[profile] select", e);
          setError(e instanceof Error ? e.message : "プロフィール取得に失敗しました");
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, userId]);

  return { profile, loading, error };
}
