import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";

const menuItems = [
  { label: "入庫", to: "/inventory/in" },
  { label: "部品移動", to: "/inventory/move-part" },
  { label: "パレット移動", to: "/pallet/move" },
  { label: "出庫", to: "/inventory/out" },
  { label: "パレット積付", to: "/pallet/items/add" },
  { label: "スキャン画面", to: "/scanner" },
];

export function MenuPage() {
  const { user, profile, profileLoading, profileError, signOut } = useAuth();
  const navigate = useNavigate();

  const displayNameLine =
    profile?.display_name?.trim() ||
    profile?.email ||
    user?.email ||
    "—";

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

      <div className="scanner-panel">
        <div className="actions">
          {menuItems.map((item) => (
            <Link key={item.to} className="btn primary" to={item.to}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
