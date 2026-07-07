"use client";

import { useState } from "react";
import { AuthPanel, type AuthUser } from "./auth-panel";
import { TournamentDashboard } from "./tournament-dashboard";

export function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);

  return (
    <>
      <AuthPanel onAuthChange={setUser} />
      {user ? (
        <TournamentDashboard />
      ) : (
        <section className="rounded-lg border border-[#d5ddd1] bg-white p-6">
          <p className="m-0 text-[#667064]">
            Bitte melde dich an, um Turniere und Matches zu verwalten.
          </p>
        </section>
      )}
    </>
  );
}
