import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminDashboardRole = "admin" | "chief" | "office" | "worker";

export type UserProfileRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  warehouse_code: string;
  is_active: boolean;
};

/**
 * auth の user に対応する user_profiles を取得する。
 */
export function useUserProfile(
  client: SupabaseClient,
  userId: string | null
): {
  profile: UserProfileRow | null;
  loading: boolean;
  error: string | null;
} {
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
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
    setProfile(null);
    setLoading(true);
    setError(null);

    void (async () => {
      const { data, error: qErr } = await client
        .from("user_profiles")
        .select("user_id, email, display_name, role, warehouse_code, is_active")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (qErr) {
        setError(qErr.message);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("ユーザープロファイルが登録されていません。");
        setProfile(null);
        setLoading(false);
        return;
      }

      const row = data as UserProfileRow;
      if (!row.is_active) {
        setError("このユーザーは無効化されています。");
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(row);
      setError(null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [client, userId]);

  const effectiveLoading =
    Boolean(userId) && !error && (loading || profile?.user_id !== userId);

  return { profile, loading: effectiveLoading, error };
}
