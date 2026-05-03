import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider.js";

export type Role = "admin" | "chief" | "office" | "worker";

/** @deprecated MenuPage 等との互換用。`Role` と同じ */
export type ProfileRole = Role;

const PROFILE_ROLES = ["admin", "chief", "office", "worker"] as const satisfies readonly Role[];

export type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: Role[];
};

function isProfileRole(role: string): role is Role {
  return (PROFILE_ROLES as readonly string[]).includes(role);
}

function SessionLoadingScreen(message: string) {
  return (
    <main className="app-root">
      <div className="scanner-shell">
        <div className="scanner-panel">
          <p className="scanner-sub">{message}</p>
        </div>
      </div>
    </main>
  );
}

function AccessDenied() {
  return (
    <main className="app-root">
      <div className="scanner-shell">
        <div className="scanner-panel error-panel" role="alert" aria-label="権限エラー">
          <h2 className="panel-title">アクセスできません</h2>
          <p className="error-message">
            この画面を利用する権限がありません。
            <br />
            メニューへ戻ってください。
          </p>
          <div className="actions">
            <Link className="btn primary" to="/menu">
              /menu へ戻る
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function ProfileErrorScreen({ message }: { message: string }) {
  return (
    <main className="app-root">
      <div className="scanner-shell">
        <div className="scanner-panel error-panel" role="alert" aria-label="プロフィールエラー">
          <h2 className="panel-title">ユーザー情報エラー</h2>
          <p className="error-message">{message}</p>
          <div className="actions">
            <Link className="btn primary" to="/menu">
              /menu へ戻る
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, loading: authLoading, profile, profileLoading, profileError } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return SessionLoadingScreen("セッション確認中…");
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (profileLoading) {
    return SessionLoadingScreen("ユーザー情報を取得中...");
  }

  if (profileError) {
    return <ProfileErrorScreen message={profileError} />;
  }

  if (!profile || !isProfileRole(profile.role)) {
    return <AccessDenied />;
  }

  if (allowedRoles != null) {
    if (allowedRoles.length === 0 || !allowedRoles.includes(profile.role)) {
      return <AccessDenied />;
    }
  }

  return children;
}
