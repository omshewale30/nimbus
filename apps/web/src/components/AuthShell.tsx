"use client";

import type { ReactNode } from "react";

import { NavBar } from "@/components/NavBar";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * The authenticated application shell.
 *
 * Renders the nav and, when auth is enabled, gates protected content behind a
 * sign-in prompt (the "unauthorized" state). Authorization decisions are always
 * enforced by the backend as well — this is UX, not a security boundary.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, authDisabled, login } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {authDisabled ? (
        <div className="border-b border-warning/20 bg-warning-bg px-4 py-2 text-center text-sm font-medium text-warning">
          Auth is disabled (local development mode). Do not use this configuration in a deployed
          environment.
        </div>
      ) : null}
      <NavBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {isAuthenticated ? (
          children
        ) : (
          <Card className="max-w-xl">
            <h2>Sign in required</h2>
            <p className="mt-2 text-sm text-muted">
              Please sign in with your organization account to continue.
            </p>
            <Button className="mt-5" type="button" onClick={login}>
              Sign in with Microsoft
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
