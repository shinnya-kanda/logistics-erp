"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AuthProvider } from "./AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const bootStyles: CSSProperties = {
  padding: "2rem",
  fontFamily: "sans-serif",
  background: "#f7f7f7",
  minHeight: "100vh",
};

export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main style={bootStyles}>
        <p>セッション確認中…</p>
      </main>
    );
  }

  const client = getSupabaseBrowserClient();
  if (!client) {
    return (
      <main style={bootStyles}>
        <h1>環境設定エラー</h1>
        <p>
          Supabase の環境変数（NEXT_PUBLIC_SUPABASE_URL /
          NEXT_PUBLIC_SUPABASE_ANON_KEY）が設定されていません。
        </p>
        <p style={{ fontSize: "0.9rem", color: "#555" }}>
          driver-app の VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY と同じ値を、上記
          NEXT_PUBLIC_* 名で設定してください。
        </p>
      </main>
    );
  }

  return <AuthProvider client={client}>{children}</AuthProvider>;
}
