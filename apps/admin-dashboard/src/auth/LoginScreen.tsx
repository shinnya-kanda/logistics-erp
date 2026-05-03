"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";

const shellStyle: CSSProperties = {
  maxWidth: "28rem",
  margin: "0 auto",
  padding: "2rem 1rem",
};

const panelStyle: CSSProperties = {
  padding: "1.5rem",
  border: "1px solid #ddd",
  borderRadius: "12px",
  background: "#fff",
};

export function LoginScreen() {
  const { client } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    }
  }

  return (
    <section style={shellStyle} aria-label="ログイン">
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>ログイン</h1>
        <p style={{ margin: 0, fontSize: "0.95rem", color: "#555" }}>
          メールアドレスとパスワードでログインしてください
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <div style={panelStyle}>
          <label
            style={{ display: "block", marginBottom: "1rem" }}
            htmlFor="admin-login-email"
          >
            <span
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "0.35rem",
                fontSize: "0.9rem",
              }}
            >
              メールアドレス
            </span>
            <input
              id="admin-login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={busy}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.65rem 0.75rem",
                fontSize: "1rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label
            style={{ display: "block", marginBottom: "1rem" }}
            htmlFor="admin-login-password"
          >
            <span
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "0.35rem",
                fontSize: "0.9rem",
              }}
            >
              パスワード
            </span>
            <input
              id="admin-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={busy}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.65rem 0.75rem",
                fontSize: "1rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />
          </label>

          {error ? (
            <p
              role="alert"
              style={{
                color: "#c62828",
                fontSize: "0.9rem",
                margin: "0 0 1rem",
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              fontWeight: 700,
              fontSize: "1rem",
              border: "none",
              borderRadius: "8px",
              background: "#1976d2",
              color: "#fff",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "ログイン中…" : "ログイン"}
          </button>
        </div>
      </form>
    </section>
  );
}
