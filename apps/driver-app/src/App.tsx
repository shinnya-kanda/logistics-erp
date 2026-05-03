import { useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider.js";
import { ProtectedRoute, type ProfileRole } from "./auth/ProtectedRoute.js";
import { getSupabaseBrowserClient } from "./lib/supabaseClient.js";
import { InventoryInPage } from "./pages/InventoryInPage.js";
import { InventoryMovePage } from "./pages/InventoryMovePage.js";
import { InventoryOutPage } from "./pages/InventoryOutPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { MenuPage } from "./pages/MenuPage.js";
import { PalletItemAddPage } from "./pages/PalletItemAddPage.js";
import { PalletMovePage } from "./pages/PalletMovePage.js";
import { ScannerPage } from "./pages/ScannerPage.js";

function SessionLoadingScreen() {
  return (
    <main className="app-root">
      <div className="scanner-shell">
        <div className="scanner-panel">
          <p className="scanner-sub">セッション確認中…</p>
        </div>
      </div>
    </main>
  );
}

function RootIndex() {
  const { session, loading } = useAuth();

  if (loading) {
    return <SessionLoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/menu" replace />;
}

const rolesMenu = ["admin", "chief", "office", "worker"] as const satisfies readonly ProfileRole[];
const rolesField = ["admin", "chief", "worker"] as const satisfies readonly ProfileRole[];
const rolesScanner = ["admin", "chief", "office", "worker"] as const satisfies readonly ProfileRole[];

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootIndex />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/menu" handle={{ allowedRoles: rolesMenu }} element={<MenuPage />} />
        <Route
          path="/inventory/in"
          handle={{ allowedRoles: rolesField }}
          element={<InventoryInPage />}
        />
        <Route
          path="/inventory/move"
          handle={{ allowedRoles: rolesField }}
          element={<Navigate replace to="/inventory/move-part" />}
        />
        <Route
          path="/inventory/move-part"
          handle={{ allowedRoles: rolesField }}
          element={<InventoryMovePage />}
        />
        <Route
          path="/inventory/out"
          handle={{ allowedRoles: rolesField }}
          element={<InventoryOutPage />}
        />
        <Route
          path="/pallet/create"
          handle={{ allowedRoles: rolesField }}
          element={<Navigate replace to="/inventory/in" />}
        />
        <Route
          path="/pallet/items/add"
          handle={{ allowedRoles: rolesField }}
          element={<PalletItemAddPage />}
        />
        <Route
          path="/pallet/move"
          handle={{ allowedRoles: rolesField }}
          element={<PalletMovePage />}
        />
        <Route path="/scanner" handle={{ allowedRoles: rolesScanner }} element={<ScannerPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

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
    <BrowserRouter>
      <AuthProvider client={supabase}>
        <main className="app-root">
          <AppRoutes />
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}
