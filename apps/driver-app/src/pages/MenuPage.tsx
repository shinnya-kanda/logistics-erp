import { Link } from "react-router-dom";

const menuItems = [
  { label: "入庫", to: "/inventory/in" },
  { label: "棚移動", to: "/inventory/move" },
  { label: "出庫", to: "/inventory/out" },
  { label: "パレット作成", to: "/pallet/create" },
  { label: "パレット積付", to: "/pallet/items/add" },
  { label: "スキャン画面", to: "/scanner" },
];

export function MenuPage() {
  return (
    <section className="scanner-shell" aria-label="作業メニュー">
      <header className="scanner-header">
        <h1 className="scanner-title">作業メニュー</h1>
        <p className="scanner-sub">作業内容を選択してください</p>
      </header>

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
