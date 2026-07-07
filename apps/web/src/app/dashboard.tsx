"use client";

import { useState } from "react";
import { AuthPanel, type AuthUser } from "./auth-panel";
import { MatchForm } from "./match-form";
import { PlayersPanel } from "./players-panel";

export function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);

  return (
    <>
      <AuthPanel onAuthChange={setUser} />
      {user ? (
        <>
          <MatchForm />
          <PlayersPanel />
        </>
      ) : (
        <section className="rounded-lg border border-[#d5ddd1] bg-white p-6">
          <p className="m-0 text-[#667064]">
            Bitte melde dich an, um Spieler und spaeter Matches zu verwalten.
          </p>
        </section>
      )}
    </>
  );
}
