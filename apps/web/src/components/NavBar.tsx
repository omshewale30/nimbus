"use client";

import Link from "next/link";

import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";

export function NavBar() {
  const { isAuthenticated, account, login, logout } = useAuth();

  return (
    <nav className="border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-navy hover:text-navy">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-carolina text-sm font-bold text-navy shadow-sm">
            N
          </span>
          <span className="text-lg font-semibold tracking-normal">Nimbus</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          <Link href="/">Home</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/prompts">Prompts</Link>
          <Link href="/projects">Projects</Link>
          <Link href="/ask">Ask</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/profile">Profile</Link>
          {isAuthenticated ? (
            <>
              {account ? <span className="text-xs text-muted">{account.name}</span> : null}
              <Button variant="secondary" size="sm" type="button" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" type="button" onClick={login}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
