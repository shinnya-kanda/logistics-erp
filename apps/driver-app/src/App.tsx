import { useMemo } from "react";
import { AuthPanel } from "./AuthPanel.js";
import { getSupabaseBrowserClient } from "./supabaseClient.js";
import { InventoryMoveApp } from "./InventoryMoveApp.js";
import { PalletCreateApp } from "./PalletCreateApp.js";
import { PalletItemAddApp } from "./PalletItemAddApp.js";
import { PalletMoveApp } from "./PalletMoveApp.js";
import { PalletOutApp } from "./PalletOutApp.js";
import { PalletItemOutApp } from "./PalletItemOutApp.js";
import { PartLocationSearchApp } from "./PartLocationSearchApp.js";
import { EmptyPalletSearchApp } from "./EmptyPalletSearchApp.js";
import { ScannerApp } from "./ScannerApp.js";

export default function App() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  if (!supabase) {
    return (
      <main className="app-root">
        <div className="scanner-shell">
          <div className="scanner-panel auth-panel">
            <h2 className="scanner-title">設定が必要です</h2>
            <p className="scanner-sub">
              <code>.env</code> に <code>VITE_SUPABASE_URL</code> と{" "}
              <code>VITE_SUPABASE_ANON_KEY</code>（anon key）を設定してください。
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-root">
      <div className="scanner-shell">
        <AuthPanel client={supabase} />
      </div>
      <InventoryMoveApp />
      <PalletCreateApp />
      <PalletItemAddApp />
      <PalletMoveApp />
      <PalletOutApp />
      <PartLocationSearchApp />
      <PalletItemOutApp />
      <EmptyPalletSearchApp />
      <ScannerApp />
    </main>
  );
}
