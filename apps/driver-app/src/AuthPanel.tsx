import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuthSession } from "./useAuthSession.js";
import { useProfile } from "./useProfile.js";

type RoleRow = { role_code: string; role_name: string };

async function fetchRoleLabels(
  client: SupabaseClient,
  userId: string
): Promise<RoleRow[]> {
  const { data: links, error: e1 } = await client
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);

  if (e1) {
    console.error("[auth] user_roles", e1);
    return [];
  }

  const ids = (links ?? []).map((r) => r.role_id).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: roles, error: e2 } = await client
    .from("roles")
    .select("role_code, role_name")
    .in("id", ids);

  if (e2) {
    console.error("[auth] roles", e2);
    return [];
  }

  return (roles ?? []) as RoleRow[];
}

export function AuthPanel({ client }: { client: SupabaseClient }) {
  const { session, loading: sessionLoading } = useAuthSession(client);
  const user = session?.user ?? null;
  const { profile, loading: profileLoading, error: profileError } = useProfile(
    client,
    user?.id ?? null
  );

  const [email, setEmail] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleRow[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setRoles([]);
      return;
    }
    let cancelled = false;
    fetchRoleLabels(client, user.id).then((r) => {
      if (!cancelled) setRoles(r);
    });
    return () => {
      cancelled = true;
    };
  }, [client, user?.id]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setInfo(null);
      setFormError(null);

      const trimmed = email.trim();
      if (!trimmed) {
        setFormError("メールアドレスを入力してください");
        return;
      }

      setSendBusy(true);
      const { error } = await client.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      setSendBusy(false);

      if (error) {
        console.error("[auth] signInWithOtp", error);
        setFormError(error.message);
        return;
      }

      setInfo("メールを確認してください（Magic Link を開くとログインできます）");
    },
    [client, email]
  );

  const onLogout = useCallback(async () => {
    setInfo(null);
    setFormError(null);
    const { error } = await client.auth.signOut();
    if (error) {
      console.error("[auth] signOut", error);
      setFormError(error.message);
    }
  }, [client]);

  if (sessionLoading) {
    return (
      <section className="auth-panel scanner-panel" aria-live="polite">
        <p className="auth-status">セッション確認中…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="auth-panel scanner-panel" aria-labelledby="auth-login-title">
        <h2 id="auth-login-title" className="scanner-title">
          Login
        </h2>
        <p className="scanner-sub">Magic Link でログイン（メールを確認してください）</p>
        <form className="scanner-form" onSubmit={onSubmit}>
          <div className="field">
            <label className="label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sendBusy}
            />
          </div>
          <button type="submit" className="btn primary" disabled={sendBusy}>
            {sendBusy ? "送信中…" : "Magic Link を送信"}
          </button>
        </form>
        {formError ? (
          <p className="auth-msg auth-msg-error" role="alert">
            {formError}
          </p>
        ) : null}
        {info ? <p className="auth-msg auth-msg-info">{info}</p> : null}
      </section>
    );
  }

  return (
    <section className="auth-panel scanner-panel" aria-labelledby="auth-logged-title">
      <h2 id="auth-logged-title" className="scanner-title">
        Logged in
      </h2>
      <dl className="auth-dl">
        <div>
          <dt>user.id</dt>
          <dd className="auth-mono">{user.id}</dd>
        </div>
        <div>
          <dt>user.email</dt>
          <dd>{user.email ?? "—"}</dd>
        </div>
        {profileLoading ? (
          <p className="auth-status">プロフィール読込中…</p>
        ) : profileError ? (
          <p className="auth-msg auth-msg-error" role="alert">
            プロフィール取得: {profileError}
          </p>
        ) : profile ? (
          <>
            <div>
              <dt>profiles.display_name</dt>
              <dd>{profile.display_name ?? "—"}</dd>
            </div>
            <div>
              <dt>profiles.email</dt>
              <dd>{profile.email ?? "—"}</dd>
            </div>
            <div>
              <dt>profiles.status</dt>
              <dd>{profile.status}</dd>
            </div>
          </>
        ) : (
          <p className="auth-msg auth-msg-error" role="alert">
            profiles が見つかりません（handle_new_user を確認してください）
          </p>
        )}
      </dl>
      {roles.length > 0 ? (
        <div className="auth-roles">
          <span className="label">roles</span>
          <ul className="auth-role-list">
            {roles.map((r) => (
              <li key={r.role_code}>
                {r.role_code} — {r.role_name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <button type="button" className="btn secondary auth-logout" onClick={onLogout}>
        ログアウト
      </button>
    </section>
  );
}
