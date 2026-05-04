import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";

const PROFILE_ROLES = ["admin", "chief", "office", "worker"] as const;
type ProfileRole = (typeof PROFILE_ROLES)[number];

function isProfileRole(role: string): role is ProfileRole {
  return (PROFILE_ROLES as readonly string[]).includes(role);
}

const menuItems: {
  label: string;
  path: string;
  allowedRoles: readonly ProfileRole[];
}[] = [
  {
    label: "入庫",
    path: "/inventory/in",
    allowedRoles: ["worker", "chief", "admin"],
  },
  {
    label: "部品移動",
    path: "/inventory/move-part",
    allowedRoles: ["worker", "chief", "admin"],
  },
  {
    label: "パレット移動",
    path: "/pallet/move",
    allowedRoles: ["worker", "chief", "admin"],
  },
  {
    label: "パレット出庫",
    path: "/pallet/out",
    allowedRoles: ["worker", "chief", "admin"],
  },
  {
    label: "品番単位出庫",
    path: "/pallet/items/out",
    allowedRoles: ["worker", "chief", "admin"],
  },
  {
    label: "パレット積付",
    path: "/pallet/items/add",
    allowedRoles: ["worker", "chief", "admin"],
  },
  {
    label: "スキャン画面",
    path: "/scanner",
    allowedRoles: ["worker", "office", "chief", "admin"],
  },
];

export function MenuPage() {
  const { user, profile, profileLoading, profileError, signOut } = useAuth();
  const navigate = useNavigate();

  const displayNameLine =
    profile?.display_name?.trim() ||
    profile?.email ||
    user?.email ||
    "—";

  let visibleMenuItems: typeof menuItems = [];
  if (
    !profileLoading &&
    !profileError &&
    profile != null &&
    isProfileRole(profile.role)
  ) {
    const role = profile.role;
    visibleMenuItems = menuItems.filter((item) => item.allowedRoles.includes(role));
  }

  async function handleLogout() {
    const { error } = await signOut();
    if (!error) {
      navigate("/login", { replace: true });
    }
  }

  return (
    <section className="scanner-shell" aria-label="作業メニュー">
      <header className="scanner-header">
        <h1 className="scanner-title">作業メニュー</h1>
        <p className="scanner-sub">作業内容を選択してください</p>
        <p className="scanner-sub">ログイン中：{user?.email ?? "—"}</p>
        {profileLoading ? (
          <p className="scanner-sub">ユーザー情報を取得中...</p>
        ) : profileError ? (
          <section
            className="scanner-panel error-panel"
            role="alert"
            aria-label="プロフィールエラー"
          >
            <h2 className="panel-title">ユーザー情報エラー</h2>
            <p className="error-message">{profileError}</p>
          </section>
        ) : profile ? (
          <>
            <p className="scanner-sub">名前：{displayNameLine}</p>
            <p className="scanner-sub">権限：{profile.role}</p>
            <p className="scanner-sub">倉庫：{profile.warehouse_code}</p>
          </>
        ) : null}
      </header>

      <div className="scanner-panel">
        <div className="actions">
          <button type="button" className="btn secondary" onClick={() => void handleLogout()}>
            ログアウト
          </button>
        </div>
      </div>

      {visibleMenuItems.length > 0 ? (
        <div className="scanner-panel">
          <div className="actions">
            {visibleMenuItems.map((item) => (
              <Link key={item.path} className="btn primary" to={item.path}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
