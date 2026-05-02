import { PalletSearchSection } from "./PalletSearchSection";

export default function AdminDashboardPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", background: "#f7f7f7", minHeight: "100vh" }}>
      <h1>物流ERP 管理ダッシュボード</h1>
      <p>管理者向けダッシュボードです。</p>
      <PalletSearchSection />
    </main>
  );
}
