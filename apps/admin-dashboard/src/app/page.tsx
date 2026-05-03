"use client";

import { useAuth } from "@/auth/AuthProvider";
import { LoginScreen } from "@/auth/LoginScreen";
import { AdminDashboardTabs } from "./AdminDashboardTabs";

const allowedRoles = new Set(["admin", "chief", "office"]);

export default function AdminDashboardPage() {
  const { session, loading, user, profile, profileLoading, profileError, signOut } =
    useAuth();
  const profileMatchesCurrentUser =
    Boolean(user?.id) && profile?.user_id === user?.id;
  const canShowDashboard =
    !loading &&
    !profileLoading &&
    !profileError &&
    profileMatchesCurrentUser &&
    profile?.is_active === true &&
    allowedRoles.has(profile.role);

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

  if (profileLoading || !user) {
    return (
      <main
        style={{
          padding: "2rem",
          fontFamily: "sans-serif",
          background: "#f7f7f7",
          minHeight: "100vh",
        }}
      >
        <p>権限を判定中…</p>
      </main>
    );
  }

  if (!canShowDashboard) {
    return (
      <main
        style={{
          padding: "2rem",
          fontFamily: "sans-serif",
          background: "#f7f7f7",
          minHeight: "100vh",
        }}
      >
        <section
          style={{
            maxWidth: "36rem",
            padding: "1.5rem",
            border: "1px solid #ddd",
            borderRadius: "12px",
            background: "#fff",
          }}
        >
          <h1 style={{ marginTop: 0 }}>権限がありません</h1>
          <p>
            この管理画面は admin / chief / office のユーザーのみ利用できます。
          </p>
          <p style={{ color: "#555", fontSize: "0.9rem" }}>
            {profileError
              ? `理由：${profileError}`
              : `現在の role：${profile?.role ?? "未取得"}`}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            style={{
              marginTop: "1rem",
              padding: "0.55rem 1rem",
              fontWeight: 600,
              border: "1px solid #bbb",
              borderRadius: "8px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            ログアウト
          </button>
        </section>
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
