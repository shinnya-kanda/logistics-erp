"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { useAuthSession } from "./useAuthSession";

export type AuthContextValue = {
  client: SupabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => ReturnType<SupabaseClient["auth"]["signOut"]>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  client,
  children,
}: {
  client: SupabaseClient;
  children: ReactNode;
}) {
  const { session, user, loading } = useAuthSession(client);

  const signOut = useCallback(() => client.auth.signOut(), [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      session,
      user,
      loading,
      signOut,
    }),
    [client, session, user, loading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
