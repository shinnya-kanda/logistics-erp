import { Link } from "react-router-dom";
import { PageShell } from "./PageShell.js";

const scannerMenuItems = [
  { label: "品番棚検索", path: "/scanner/part-location" },
  { label: "空パレット検索", path: "/scanner/empty-pallets" },
  { label: "Logistics ERP Scanner", path: "/scanner" },
];

export function ScannerMenuPage() {
  return (
    <PageShell>
      <section className="scanner-shell" aria-label="スキャンメニュー">
        <header className="scanner-header">
          <h1 className="scanner-title">スキャンメニュー</h1>
          <p className="scanner-sub">利用する機能を選択してください</p>
        </header>

        <section className="scanner-panel">
          <div className="actions">
            {scannerMenuItems.map((item) => (
              <Link key={item.path} className="btn primary" to={item.path}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </section>
    </PageShell>
  );
}
