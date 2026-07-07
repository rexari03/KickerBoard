"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  email: string;
  role: "PLAYER" | "ADMIN";
  profile: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

type AuthMode = "login" | "register";

type AuthPanelProps = {
  onAuthChange: (user: AuthUser | null) => void;
};

export function AuthPanel({ onAuthChange }: AuthPanelProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      onAuthChange(null);
      return;
    }

    const nextUser = (await response.json()) as AuthUser;
    setUser(nextUser);
    onAuthChange(nextUser);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/auth/${mode}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { displayName } : {})
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "Anmeldung fehlgeschlagen.");
      }

      const nextUser = (await response.json()) as AuthUser;
      setUser(nextUser);
      onAuthChange(nextUser);
      setEmail("");
      setPassword("");
      setDisplayName("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Anmeldung fehlgeschlagen."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });

    setUser(null);
    onAuthChange(null);
  }

  if (user) {
    return (
      <section
        className="grid gap-4 rounded-lg border border-[#d5ddd1] bg-white p-6"
        aria-label="Aktuelle Sitzung"
      >
        <div className="grid gap-1.5">
          <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">Session</p>
          <h2 className="m-0 text-xl font-bold">
            {user.profile?.displayName ?? user.email}
          </h2>
        </div>
        <p className="m-0 text-[#667064]">{user.email}</p>
        <button
          className="min-h-10 cursor-pointer rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3 py-2.5 font-extrabold text-[#172018]"
          type="button"
          onClick={handleLogout}
        >
          Abmelden
        </button>
      </section>
    );
  }

  return (
    <section
      className="grid gap-4 rounded-lg border border-[#d5ddd1] bg-white p-6"
      aria-label="Authentifizierung"
    >
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Auth Modus">
        <button
          aria-selected={mode === "login"}
          className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2.5 font-extrabold ${
            mode === "login"
              ? "border-[#2f6f4e] bg-[#2f6f4e] text-white"
              : "border-[#ccd7c7] bg-[#fbfcfa] text-[#172018]"
          }`}
          type="button"
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          aria-selected={mode === "register"}
          className={`min-h-10 cursor-pointer rounded-lg border px-3 py-2.5 font-extrabold ${
            mode === "register"
              ? "border-[#2f6f4e] bg-[#2f6f4e] text-white"
              : "border-[#ccd7c7] bg-[#fbfcfa] text-[#172018]"
          }`}
          type="button"
          onClick={() => setMode("register")}
        >
          Registrieren
        </button>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label className="grid gap-2 font-bold">
            <span>Name</span>
            <input
              className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
              required
              minLength={2}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="z. B. Calvin"
            />
          </label>
        ) : null}

        <label className="grid gap-2 font-bold">
          <span>E-Mail</span>
          <input
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="calvin@example.com"
          />
        </label>

        <label className="grid gap-2 font-bold">
          <span>Passwort</span>
          <input
            className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
            required
            minLength={12}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mindestens 12 Zeichen"
          />
        </label>

        <button
          className="min-h-11 cursor-pointer rounded-lg bg-[#265c42] px-4 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Bitte warten..."
            : mode === "login"
              ? "Einloggen"
              : "Account erstellen"}
        </button>

        {error ? <p className="m-0 font-bold text-[#9f2f24]">{error}</p> : null}
      </form>
    </section>
  );
}
