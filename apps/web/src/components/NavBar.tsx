"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthProvider";

export function NavBar() {
  const { isAuthenticated, account, login, logout } = useAuth();

  return (
    <nav className="nav">
      <div className="nav-brand">Nimbus</div>
      <div className="nav-links">
        <Link href="/">Home</Link>
        <Link href="/guides">Guides</Link>
        <Link href="/prompts">Prompts</Link>
        <Link href="/projects">Projects</Link>
        <Link href="/chat">Assistant</Link>
        <Link href="/profile">Profile</Link>
        {isAuthenticated ? (
          <>
            {account ? <span className="nav-user">{account.name}</span> : null}
            <button className="btn btn-secondary" type="button" onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <button className="btn" type="button" onClick={login}>
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
}
