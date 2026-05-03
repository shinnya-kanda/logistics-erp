import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserProfileRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  warehouse_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * auth の user に対応する user_profiles を取得する。
 * - user が null → profile null（エラーなし）
 * - 行が無い / 取得失敗 / is_active=false → error
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
    setLoading(true);
    setError(null);

    void (async () => {
      const { data, error: qErr } = await client
        .from("user_profiles")
        .select(
          "user_id, email, display_name, role, warehouse_code, is_active, created_at, updated_at"
        )
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
        setError(
          "ユーザー情報（user_profiles）が登録されていません。管理者に連絡してプロファイルを作成してください。"
        );
        setProfile(null);
        setLoading(false);
        return;
      }

      const row = data as UserProfileRow;

      if (!row.is_active) {
        setError("このユーザーは無効化されています。管理者に連絡してください。");
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

  return { profile, loading, error };
}
