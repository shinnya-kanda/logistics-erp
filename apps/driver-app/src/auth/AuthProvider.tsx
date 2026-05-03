import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { useAuthSession } from "./useAuthSession.js";
import { useUserProfile, type UserProfileRow } from "./useUserProfile.js";

export type AuthContextValue = {
  client: SupabaseClient;
  session: Session | null;
  user: User | null;
  /** 認証セッション読込（後方互換: authLoading と同値） */
  loading: boolean;
  authLoading: boolean;
  profile: UserProfileRow | null;
  profileLoading: boolean;
  profileError: string | null;
  signOut: SupabaseClient["auth"]["signOut"];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  client,
  children,
}: {
  client: SupabaseClient;
  children: ReactNode;
}) {
  const { session, user, loading: authLoading } = useAuthSession(client);
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile(client, user?.id ?? null);

  const signOut = useCallback(() => client.auth.signOut(), [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      session,
      user,
      loading: authLoading,
      authLoading,
      profile,
      profileLoading,
      profileError,
      signOut,
    }),
    [
      client,
      session,
      user,
      authLoading,
      profile,
      profileLoading,
      profileError,
      signOut,
    ]
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
