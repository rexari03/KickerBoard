"use client";

import { useState } from "react";
import { AuthPanel, type AuthUser } from "./auth-panel";
import { MatchForm } from "./match-form";
import { PlayersPanel } from "./players-panel";
import { RankingBoard } from "./ranking-board";

export function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);

  return (
    <>
      <AuthPanel onAuthChange={setUser} />
      {user ? (
        <>
          <MatchForm
            onMatchSaved={() =>
              setRankingRefreshKey((currentRefreshKey) => currentRefreshKey + 1)
            }
          />
          <RankingBoard refreshKey={rankingRefreshKey} />
          <PlayersPanel />
        </>
      ) : (
        <section className="rounded-lg border border-[#d5ddd1] bg-white p-6">
          <p className="m-0 text-[#667064]">
            Bitte melde dich an, um Spieler und später Matches zu verwalten.
          </p>
        </section>
      )}
    </>
  );
}
