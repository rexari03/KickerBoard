"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "./auth-panel";
import { MatchForm } from "./match-form";
import { MatchList } from "./match-list";
import { RankingBoard } from "./ranking-board";
import { Avatar } from "./avatar";
import type { TournamentDetail } from "./tournament-dashboard";

type TournamentDetailPageProps = {
  tournamentId: string;
};

export function TournamentDetailPage({ tournamentId }: TournamentDetailPageProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadTournament();
  }, [tournamentId, rankingRefreshKey]);

  async function loadTournament() {
    setIsLoading(true);
    setError(null);

    try {
      const [tournamentResponse, userResponse] = await Promise.all([
        fetch(`${apiUrl}/tournaments/${tournamentId}`, {
          credentials: "include"
        }),
        fetch(`${apiUrl}/auth/me`, {
          credentials: "include"
        })
      ]);

      if (!tournamentResponse.ok) {
        if (tournamentResponse.status === 403) {
          throw new Error("Du bist diesem Turnier noch nicht beigetreten.");
        }

        throw new Error("Turnier konnte nicht geladen werden.");
      }

      if (!userResponse.ok) {
        throw new Error("Du bist nicht angemeldet.");
      }

      setCurrentUser((await userResponse.json()) as AuthUser);
      setTournament((await tournamentResponse.json()) as TournamentDetail);
    } catch (loadError) {
      setTournament(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Turnier konnte nicht geladen werden."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-[#d5ddd1] bg-white p-6">
        <p className="m-0 text-[#667064]">Turnier wird geladen...</p>
      </section>
    );
  }

  if (error || !tournament) {
    return (
      <section className="grid gap-4 rounded-lg border border-[#d5ddd1] bg-white p-6">
        <p className="m-0 font-bold text-[#9f2f24]">
          {error ?? "Turnier konnte nicht geladen werden."}
        </p>
        <Link
          className="w-fit rounded-lg bg-[#265c42] px-4 py-3 font-extrabold text-white"
          href="/tournaments"
        >
          Zur Übersicht
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <div className="min-w-0 rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6">
        <Link className="text-sm font-bold text-[#2f6f4e]" href="/tournaments">
          Zurück zur Übersicht
        </Link>
        <p className="m-0 mt-5 text-xs font-bold uppercase text-[#2f6f4e]">
          Aktives Turnier
        </p>
        <div className="mt-2 flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 break-words text-3xl font-extrabold sm:text-4xl">
              {tournament.name}
            </h1>
            <p className="m-0 mt-2 text-[#667064]">
              {tournament.participants.length} Teilnehmer · {tournament.matchCount}{" "}
              Matches
            </p>
          </div>
          <p className="m-0 text-sm text-[#667064]">
            Besitzer: {tournament.owner.displayName}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
        <div className="grid min-w-0 gap-5 xl:gap-6">
          <MatchForm
            currentUserId={currentUser?.id ?? null}
            participants={tournament.participants}
            tournamentId={tournament.id}
            onMatchSaved={() =>
              setRankingRefreshKey((currentRefreshKey) => currentRefreshKey + 1)
            }
          />
          {currentUser ? (
            <MatchList
              currentUserId={currentUser.id}
              refreshKey={rankingRefreshKey}
              tournamentId={tournament.id}
              onMatchConfirmed={() =>
                setRankingRefreshKey((currentRefreshKey) => currentRefreshKey + 1)
              }
            />
          ) : null}
          <RankingBoard
            refreshKey={rankingRefreshKey}
            tournamentId={tournament.id}
          />
        </div>

        <aside className="min-w-0 rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6">
          <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
            Teilnehmer
          </p>
          <h2 className="m-0 mt-1 text-xl font-bold">Roster</h2>
          <ul className="mt-4 grid list-none gap-2.5 p-0">
            {tournament.participants.map((participant) => (
              <li
                className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-[#e2e8df] bg-[#fbfcfa] p-3"
                key={participant.id}
              >
                <Avatar
                  avatarUrl={participant.user.avatarUrl}
                  displayName={participant.user.displayName}
                />
                <span className="min-w-0">
                  <strong className="block truncate">
                    {participant.user.displayName}
                  </strong>
                  <small className="block text-[#667064]">{participant.role}</small>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
