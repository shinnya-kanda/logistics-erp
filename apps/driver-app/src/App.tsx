import { useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider.js";
import { ProtectedRoute, type Role } from "./auth/ProtectedRoute.js";
import { getSupabaseBrowserClient } from "./lib/supabaseClient.js";
import { InventoryInPage } from "./pages/InventoryInPage.js";
import { InventoryMovePage } from "./pages/InventoryMovePage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { MenuPage } from "./pages/MenuPage.js";
import { PalletItemAddPage } from "./pages/PalletItemAddPage.js";
import { PalletItemOutPage } from "./pages/PalletItemOutPage.js";
import { PalletMovePage } from "./pages/PalletMovePage.js";
import { PalletOutPage } from "./pages/PalletOutPage.js";
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

const rolesMenu: Role[] = ["admin", "chief", "office", "worker"];
const rolesField: Role[] = ["admin", "chief", "worker"];
const rolesScanner: Role[] = ["admin", "chief", "office", "worker"];

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootIndex />} />
      <Route
        path="/menu"
        element={
          <ProtectedRoute allowedRoles={rolesMenu}>
            <MenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/in"
        element={
          <ProtectedRoute allowedRoles={rolesField}>
            <InventoryInPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/move"
        element={
          <ProtectedRoute allowedRoles={rolesField}>
            <Navigate replace to="/inventory/move-part" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/move-part"
        element={
          <ProtectedRoute allowedRoles={rolesField}>
            <InventoryMovePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/out"
        element={
          <ProtectedRoute allowedRoles={rolesField}>
            <Navigate replace to="/pallet/out" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pallet/create"
        element={
          <ProtectedRoute allowedRoles={rolesField}>
            <Navigate replace to="/inventory/in" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pallet/items/add"
        element={
          <ProtectedRoute allowedRoles={rolesField}>
            <PalletItemAddPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pallet/move"
        element={
          <ProtectedRoute allowedRoles={rolesField}>
            <PalletMovePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pallet/out"
        element={
          <ProtectedRoute allowedRoles={rolesField}>
            <PalletOutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pallet/items/out"
        element={
          <ProtectedRoute allowedRoles={rolesField}>
            <PalletItemOutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scanner"
        element={
          <ProtectedRoute allowedRoles={rolesScanner}>
            <ScannerPage />
          </ProtectedRoute>
        }
      />
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
