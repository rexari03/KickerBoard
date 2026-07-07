"use client";

import { APP_NAME } from "@kicker-board/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authChangedEventName, type AuthUser } from "./auth-panel";

export function AppHeader() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadCurrentUser();

    const handleAuthChange = (event: Event) => {
      setUser((event as CustomEvent<AuthUser | null>).detail);
    };
    const handleFocus = () => {
      void loadCurrentUser();
    };

    window.addEventListener(authChangedEventName, handleAuthChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener(authChangedEventName, handleAuthChange);
      window.removeEventListener("focus", handleFocus);
    };
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
    setIsMenuOpen(false);
    window.dispatchEvent(
      new CustomEvent<AuthUser | null>(authChangedEventName, { detail: null })
    );
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[#d5ddd1] bg-[#f5f7f2]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-3 sm:px-5 md:flex-row md:items-center md:justify-between md:gap-3 md:px-8 md:py-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Link
            className="min-w-0 truncate text-xl font-extrabold text-[#172018]"
            href="/"
            onClick={() => setIsMenuOpen(false)}
          >
            {APP_NAME}
          </Link>

          <button
            aria-controls="app-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Menü schließen" : "Menü öffnen"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#ccd7c7] bg-white text-[#172018] md:hidden"
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span className="sr-only">
              {isMenuOpen ? "Menü schließen" : "Menü öffnen"}
            </span>
            <span className="grid gap-1.5">
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition ${
                  isMenuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition ${
                  isMenuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

        <nav
          className={`${
            isMenuOpen ? "flex" : "hidden"
          } min-w-0 flex-col gap-2 border-t border-[#d5ddd1] pt-3 md:flex md:flex-row md:flex-wrap md:items-center md:border-0 md:pt-0`}
          id="app-navigation"
        >
          {user ? (
            <Link
              className="rounded-lg px-3 py-2.5 text-sm font-bold text-[#3f4b40] hover:bg-white md:py-2"
              href="/dashboard"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
          ) : null}
          <Link
            className="rounded-lg px-3 py-2.5 text-sm font-bold text-[#3f4b40] hover:bg-white md:py-2"
            href="/tournaments"
            onClick={() => setIsMenuOpen(false)}
          >
            Turniere
          </Link>

          {user ? (
            <>
              <Link
                className="rounded-lg px-3 py-2.5 text-sm font-bold text-[#3f4b40] hover:bg-white md:py-2"
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
              >
                Einstellungen
              </Link>
              <span className="max-w-full truncate rounded-full bg-[#eef3eb] px-3 py-2 text-sm font-bold text-[#2f6f4e] md:max-w-52 md:py-1">
                {user.displayName}
              </span>
              <button
                className="rounded-lg border border-[#ccd7c7] bg-white px-3 py-2.5 text-left text-sm font-bold text-[#172018] md:py-2"
                type="button"
                onClick={handleLogout}
              >
                Abmelden
              </button>
            </>
          ) : (
            <Link
              className="rounded-lg bg-[#265c42] px-3 py-2.5 text-center text-sm font-extrabold text-white md:py-2"
              href="/"
              onClick={() => setIsMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
