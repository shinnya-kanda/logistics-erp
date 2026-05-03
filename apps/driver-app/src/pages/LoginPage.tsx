import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";

export function LoginPage() {
  const { client, session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <main className="app-root">
        <div className="scanner-shell">
          <div className="scanner-panel">
            <p className="scanner-sub">セッション確認中…</p>
          </div>
        </div>
      </main>
    );
  }

  if (session) {
    return <Navigate to="/menu" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("メールアドレスを入力してください。");
      return;
    }
    if (!password) {
      setError("パスワードを入力してください。");
      return;
    }

    setBusy(true);
    const { error: signError } = await client.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setBusy(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    navigate("/menu", { replace: true });
  }

  return (
    <section className="scanner-shell" aria-label="ログイン">
      <header className="scanner-header">
        <h1 className="scanner-title">ログイン</h1>
        <p className="scanner-sub">メールアドレスとパスワードでログインしてください</p>
      </header>

      <form className="scanner-form" onSubmit={handleSubmit}>
        <div className="scanner-panel">
          <label className="field" htmlFor="login-email">
            <span className="label">メールアドレス</span>
            <input
              id="login-email"
              className="input large"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={busy}
            />
          </label>

          <label className="field" htmlFor="login-password">
            <span className="label">パスワード</span>
            <input
              id="login-password"
              className="input large"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={busy}
            />
          </label>

          {error ? (
            <p className="auth-msg auth-msg-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="actions">
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "ログイン中…" : "ログイン"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
