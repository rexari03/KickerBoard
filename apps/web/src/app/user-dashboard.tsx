"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UserStats = {
  ownedTournamentCount: number;
  joinedTournamentCount: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  recentTournaments: Array<{
    id: string;
    name: string;
    participantCount: number;
    matchCount: number;
    updatedAt: string;
  }>;
};

export function UserDashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadStats();
  }, []);

  async function loadStats() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/auth/me/stats`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Statistiken konnten nicht geladen werden.");
      }

      setStats((await response.json()) as UserStats);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Statistiken konnten nicht geladen werden."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-[#d5ddd1] bg-white p-6">
        <p className="m-0 text-[#667064]">Statistiken werden geladen...</p>
      </section>
    );
  }

  if (error || !stats) {
    return (
      <section className="rounded-lg border border-[#d5ddd1] bg-white p-6">
        <p className="m-0 font-bold text-[#9f2f24]">
          {error ?? "Statistiken konnten nicht geladen werden."}
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <StatCard label="Turniere" value={stats.joinedTournamentCount.toString()} />
        <StatCard label="Eigene Turniere" value={stats.ownedTournamentCount.toString()} />
        <StatCard label="Matches" value={stats.gamesPlayed.toString()} />
        <StatCard label="Siegquote" value={formatPercent(stats.winRate)} />
      </section>

      <section className="rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
              Schnellzugriff
            </p>
            <h2 className="m-0 mt-1 text-2xl font-extrabold">Letzte Turniere</h2>
          </div>
          <Link
            className="w-full rounded-lg bg-[#265c42] px-4 py-3 text-center font-extrabold text-white sm:w-fit"
            href="/tournaments"
          >
            Turniere öffnen
          </Link>
        </div>

        {stats.recentTournaments.length === 0 ? (
          <p className="m-0 mt-4 text-[#667064]">
            Du bist noch keinem Turnier beigetreten.
          </p>
        ) : (
          <div className="mt-5 grid gap-3">
            {stats.recentTournaments.map((tournament) => (
              <Link
                className="grid gap-1 rounded-lg border border-[#e2e8df] bg-[#fbfcfa] p-4 text-[#172018]"
                href={`/tournaments/${tournament.id}`}
                key={tournament.id}
              >
                <strong>{tournament.name}</strong>
                <span className="text-sm text-[#667064]">
                  {tournament.participantCount} Teilnehmer · {tournament.matchCount}{" "}
                  Matches
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6">
      <p className="m-0 text-xs font-bold uppercase text-[#667064]">{label}</p>
      <p className="m-0 mt-2 text-3xl font-extrabold text-[#172018] sm:text-4xl">
        {value}
      </p>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
