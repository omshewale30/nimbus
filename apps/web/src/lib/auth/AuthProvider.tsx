"use client";

/**
 * App-wide authentication boundary.
 *
 * Exposes a small, MSAL-agnostic `useAuth()` context so components never touch
 * MSAL directly. This keeps all MSAL hooks inside `EntraAuthBridge`, which is
 * only mounted when auth is enabled — so local dev (`NEXT_PUBLIC_AUTH_DISABLED`)
 * needs no Entra configuration and no MSAL provider.
 */
import {
  InteractionRequiredAuthError,
  InteractionStatus,
  PublicClientApplication,
} from "@azure/msal-browser";
import { MsalProvider, useIsAuthenticated, useMsal } from "@azure/msal-react";
import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { apiRequest, loginRequest, msalConfig } from "@/lib/auth/msalConfig";
import { config } from "@/lib/config";

export interface AuthAccount {
  name: string;
  email: string;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  authDisabled: boolean;
  account: AuthAccount | null;
  login: () => void;
  logout: () => void;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

/** Local-dev value: a fixed, clearly-fake principal and a no-op token. */
const DISABLED_VALUE: AuthContextValue = {
  isAuthenticated: true,
  authDisabled: true,
  account: { name: "Local Developer", email: "dev@localhost" },
  login: () => {},
  logout: () => {},
  getToken: async () => null,
};

/** Bridges MSAL state into our AuthContext. Only mounted under MsalProvider. */
function EntraAuthBridge({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const active = useMemo(() => instance.getActiveAccount() ?? accounts[0] ?? null, [instance, accounts]);
  const redirectStartedRef = useRef(false);

  useEffect(() => {
    if (!instance.getActiveAccount() && accounts[0]) {
      instance.setActiveAccount(accounts[0]);
    }
  }, [instance, accounts]);

  const login = useCallback(() => {
    if (inProgress !== InteractionStatus.None) return;
    void instance.loginRedirect(loginRequest);
  }, [instance, inProgress]);

  const logout = useCallback(() => {
    if (inProgress !== InteractionStatus.None) return;
    void instance.logoutRedirect();
  }, [instance, inProgress]);

  const getToken = useCallback(async () => {
    if (!active || inProgress !== InteractionStatus.None) return null;

    try {
      const result = await instance.acquireTokenSilent({ ...apiRequest, account: active });
      return result.accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) {
        throw error;
      }

      if (redirectStartedRef.current) return null;
      redirectStartedRef.current = true;

      try {
        await instance.acquireTokenRedirect({ ...apiRequest, account: active });
      } catch (redirectError) {
        redirectStartedRef.current = false;
        throw redirectError;
      }
      return null;
    }
  }, [active, inProgress, instance]);

  const value = useMemo<AuthContextValue>(() => {
    const account: AuthAccount | null = active
      ? { name: active.name ?? active.username, email: active.username }
      : null;

    return {
      isAuthenticated,
      authDisabled: false,
      account,
      login,
      logout,
      getToken,
    };
  }, [active, getToken, isAuthenticated, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Stable per-config choice — not a conditional hook.
  const instance = useMemo(
    () => (config.authDisabled ? null : new PublicClientApplication(msalConfig)),
    [],
  );

  if (!instance) {
    return <AuthContext.Provider value={DISABLED_VALUE}>{children}</AuthContext.Provider>;
  }

  return (
    <MsalProvider instance={instance}>
      <EntraAuthBridge>{children}</EntraAuthBridge>
    </MsalProvider>
  );
}
