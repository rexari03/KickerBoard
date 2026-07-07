"use client";

import { APP_NAME } from "@kicker-board/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "./auth-panel";

export function AppHeader() {
  const [user, setUser] = useState<AuthUser | null>(null);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    const response = await fetch(`${apiUrl}/auth/me`, {
      credentials: "include"
    });

    if (!response.ok) {
      setUser(null);
      return;
    }

    setUser((await response.json()) as AuthUser);
  }

  async function handleLogout() {
    await fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });

    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[#d5ddd1] bg-[#f5f7f2]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <Link className="text-xl font-extrabold text-[#172018]" href="/">
          {APP_NAME}
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {user ? (
            <Link
              className="rounded-lg px-3 py-2 text-sm font-bold text-[#3f4b40] hover:bg-white"
              href="/dashboard"
            >
              Dashboard
            </Link>
          ) : null}
          <Link
            className="rounded-lg px-3 py-2 text-sm font-bold text-[#3f4b40] hover:bg-white"
            href="/tournaments"
          >
            Turniere
          </Link>

          {user ? (
            <>
              <Link
                className="rounded-lg px-3 py-2 text-sm font-bold text-[#3f4b40] hover:bg-white"
                href="/settings"
              >
                Einstellungen
              </Link>
              <span className="rounded-full bg-[#eef3eb] px-3 py-1 text-sm font-bold text-[#2f6f4e]">
                {user.displayName}
              </span>
              <button
                className="rounded-lg border border-[#ccd7c7] bg-white px-3 py-2 text-sm font-bold text-[#172018]"
                type="button"
                onClick={handleLogout}
              >
                Abmelden
              </button>
            </>
          ) : (
            <Link
              className="rounded-lg bg-[#265c42] px-3 py-2 text-sm font-extrabold text-white"
              href="/"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
