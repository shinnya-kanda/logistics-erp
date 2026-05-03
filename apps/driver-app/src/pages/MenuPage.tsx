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
  const { client, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    const { error } = await client.auth.signOut();
    if (!error) {
      navigate("/login", { replace: true });
    }
  }

  return (
    <section className="scanner-shell" aria-label="作業メニュー">
      <header className="scanner-header">
        <h1 className="scanner-title">作業メニュー</h1>
        <p className="scanner-sub">作業内容を選択してください</p>
        <p className="scanner-sub">
          ログイン中：{user?.email ?? "—"}
        </p>
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
