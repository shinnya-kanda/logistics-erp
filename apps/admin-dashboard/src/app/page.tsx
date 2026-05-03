"use client";

import { useAuth } from "@/auth/AuthProvider";
import { LoginScreen } from "@/auth/LoginScreen";
import { AdminDashboardTabs } from "./AdminDashboardTabs";

export default function AdminDashboardPage() {
  const { session, loading, user, signOut } = useAuth();

  if (loading) {
    return (
      <main
        style={{
          padding: "2rem",
          fontFamily: "sans-serif",
          background: "#f7f7f7",
          minHeight: "100vh",
        }}
      >
        <p>セッション確認中…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main
        style={{
          padding: "2rem",
          fontFamily: "sans-serif",
          background: "#f7f7f7",
          minHeight: "100vh",
        }}
      >
        <LoginScreen />
      </main>
    );
  }

  const email = user?.email ?? "";

  return (
    <main
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        background: "#f7f7f7",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <span style={{ fontSize: "0.875rem", color: "#555" }}>
          ログイン中：{email || "—"}
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          style={{
            padding: "0.45rem 0.9rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            border: "1px solid #bbb",
            borderRadius: "8px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ログアウト
        </button>
      </header>

      <h1>物流ERP 管理ダッシュボード</h1>
      <p>管理者向けダッシュボードです。</p>
      <AdminDashboardTabs />
    </main>
  );
}
