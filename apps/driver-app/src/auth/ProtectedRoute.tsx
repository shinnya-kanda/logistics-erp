import { Link, Navigate, Outlet, useLocation, useMatches } from "react-router-dom";
import { useAuth } from "./AuthProvider.js";

export type ProfileRole = "admin" | "chief" | "office" | "worker";

const PROFILE_ROLES = ["admin", "chief", "office", "worker"] as const satisfies readonly ProfileRole[];

export type ProtectedRouteHandle = {
  allowedRoles: readonly ProfileRole[];
};

function isProfileRole(role: string): role is ProfileRole {
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

function readAllowedRoles(matches: ReturnType<typeof useMatches>): readonly ProfileRole[] | null {
  for (let i = matches.length - 1; i >= 0; i--) {
    const h = matches[i]?.handle as ProtectedRouteHandle | undefined;
    if (h?.allowedRoles != null && h.allowedRoles.length > 0) {
      return h.allowedRoles;
    }
  }
  return null;
}

export function ProtectedRoute() {
  const { session, loading: authLoading, profile, profileLoading, profileError } = useAuth();
  const location = useLocation();
  const matches = useMatches();
  const allowedRoles = readAllowedRoles(matches);

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

  if (allowedRoles == null) {
    return <AccessDenied />;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}
