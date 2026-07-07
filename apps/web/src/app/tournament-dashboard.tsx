"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MatchForm } from "./match-form";
import { RankingBoard } from "./ranking-board";

type TournamentSummary = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "ARCHIVED";
  owner: {
    id: string;
    displayName: string;
  };
  participantCount: number;
  matchCount: number;
  isOwner: boolean;
  isParticipant: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TournamentParticipant = {
  id: string;
  role: "PLAYER" | "MANAGER";
  joinedAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
};

type TournamentDetail = TournamentSummary & {
  participants: TournamentParticipant[];
};

type TournamentForm = {
  name: string;
  password: string;
};

const initialTournamentForm: TournamentForm = {
  name: "",
  password: ""
};

export function TournamentDashboard() {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(
    null
  );
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentDetail | null>(null);
  const [createForm, setCreateForm] = useState<TournamentForm>(
    initialTournamentForm
  );
  const [joinPasswords, setJoinPasswords] = useState<Record<string, string>>({});
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadTournaments();
  }, []);

  useEffect(() => {
    if (!selectedTournamentId) {
      setSelectedTournament(null);
      return;
    }

    void loadTournamentDetail(selectedTournamentId);
  }, [selectedTournamentId, rankingRefreshKey]);

  async function loadTournaments() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/tournaments`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Turniere konnten nicht geladen werden.");
      }

      const nextTournaments = (await response.json()) as TournamentSummary[];
      const firstJoinedTournament = nextTournaments.find(
        (tournament) => tournament.isParticipant
      );

      setTournaments(nextTournaments);
      setSelectedTournamentId((current) => {
        if (
          current &&
          nextTournaments.some(
            (tournament) => tournament.id === current && tournament.isParticipant
          )
        ) {
          return current;
        }

        return firstJoinedTournament?.id ?? null;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Turniere konnten nicht geladen werden."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTournamentDetail(tournamentId: string) {
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/tournaments/${tournamentId}`, {
        credentials: "include"
      });

      if (!response.ok) {
        if (response.status === 403) {
          setSelectedTournament(null);
          setSelectedTournamentId(null);
          throw new Error("Du bist diesem Turnier noch nicht beigetreten.");
        }

        throw new Error("Turnier konnte nicht geladen werden.");
      }

      setSelectedTournament((await response.json()) as TournamentDetail);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Turnier konnte nicht geladen werden."
      );
    }
  }

  async function handleCreateTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/tournaments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(createForm)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "Turnier konnte nicht erstellt werden.");
      }

      const tournament = (await response.json()) as TournamentSummary;
      setCreateForm(initialTournamentForm);
      setSelectedTournamentId(tournament.id);
      setMessage("Turnier erstellt.");
      await loadTournaments();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Turnier konnte nicht erstellt werden."
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinTournament(tournamentId: string) {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/tournaments/${tournamentId}/join`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: joinPasswords[tournamentId] ?? ""
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "Turnierbeitritt fehlgeschlagen.");
      }

      setJoinPasswords((current) => ({ ...current, [tournamentId]: "" }));
      setSelectedTournamentId(tournamentId);
      setMessage("Turnier beigetreten.");
      await loadTournaments();
      await loadTournamentDetail(tournamentId);
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Turnierbeitritt fehlgeschlagen."
      );
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          className="grid gap-[18px] rounded-lg border border-[#d5ddd1] bg-white p-6"
          onSubmit={handleCreateTournament}
        >
          <div className="grid gap-1.5">
            <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
              Turnier
            </p>
            <h2 className="m-0 text-xl font-bold">Turnier erstellen</h2>
            <p className="m-0 text-sm leading-6 text-[#667064]">
              Das Passwort teilen Spieler untereinander, um beizutreten.
            </p>
          </div>

          <label className="grid gap-2 font-bold">
            <span>Name</span>
            <input
              className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
              required
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              placeholder="Freitag Kicker"
            />
          </label>

          <label className="grid gap-2 font-bold">
            <span>Turnierpasswort</span>
            <input
              className="w-full rounded-lg border border-[#ccd7c7] bg-[#fbfcfa] px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
              minLength={6}
              required
              type="password"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  password: event.target.value
                }))
              }
              placeholder="Mindestens 6 Zeichen"
            />
          </label>

          <button
            className="min-h-11 cursor-pointer rounded-lg bg-[#265c42] px-4 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "Erstellt..." : "Turnier erstellen"}
          </button>
        </form>

        <section className="rounded-lg border border-[#d5ddd1] bg-white p-6">
          <div className="grid gap-1.5">
            <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
              Übersicht
            </p>
            <h2 className="m-0 text-xl font-bold">Turniere</h2>
          </div>

          {isLoading ? (
            <p className="m-0 mt-4 text-[#667064]">Turniere werden geladen...</p>
          ) : null}

          {!isLoading && tournaments.length === 0 ? (
            <p className="m-0 mt-4 text-[#667064]">Noch keine Turniere vorhanden.</p>
          ) : null}

          <div className="mt-4 grid gap-3">
            {tournaments.map((tournament) => (
              <article
                className={`grid gap-3 rounded-lg border p-4 ${
                  selectedTournamentId === tournament.id
                    ? "border-[#2f6f4e] bg-[#f4faf6]"
                    : "border-[#e2e8df] bg-[#fbfcfa]"
                }`}
                key={tournament.id}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <button
                    className={`text-left ${
                      tournament.isParticipant ? "cursor-pointer" : "cursor-default"
                    }`}
                    disabled={!tournament.isParticipant}
                    type="button"
                    onClick={() => {
                      if (tournament.isParticipant) {
                        setSelectedTournamentId(tournament.id);
                      }
                    }}
                  >
                    <h3 className="m-0 text-lg font-extrabold">{tournament.name}</h3>
                    <p className="m-0 mt-1 text-sm text-[#667064]">
                      {tournament.participantCount} Teilnehmer ·{" "}
                      {tournament.matchCount} Matches · Besitzer:{" "}
                      {tournament.owner.displayName}
                    </p>
                  </button>

                  <span className="rounded-full bg-[#eef3eb] px-3 py-1 text-xs font-bold uppercase text-[#2f6f4e]">
                    {tournament.isParticipant ? "Beigetreten" : "Offen"}
                  </span>
                </div>

                {!tournament.isParticipant ? (
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <input
                      className="w-full rounded-lg border border-[#ccd7c7] bg-white px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
                      type="password"
                      value={joinPasswords[tournament.id] ?? ""}
                      onChange={(event) =>
                        setJoinPasswords((current) => ({
                          ...current,
                          [tournament.id]: event.target.value
                        }))
                      }
                      placeholder="Turnierpasswort"
                    />
                    <button
                      className="min-h-11 cursor-pointer rounded-lg bg-[#265c42] px-4 py-3 font-extrabold text-white"
                      type="button"
                      onClick={() => void handleJoinTournament(tournament.id)}
                    >
                      Beitreten
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </section>

      {message ? <p className="m-0 font-bold text-[#2f6f4e]">{message}</p> : null}
      {error ? <p className="m-0 font-bold text-[#9f2f24]">{error}</p> : null}

      {selectedTournament ? (
        <TournamentDetailView
          tournament={selectedTournament}
          rankingRefreshKey={rankingRefreshKey}
          onMatchSaved={() =>
            setRankingRefreshKey((currentRefreshKey) => currentRefreshKey + 1)
          }
        />
      ) : null}
    </div>
  );
}

function TournamentDetailView({
  tournament,
  rankingRefreshKey,
  onMatchSaved
}: {
  tournament: TournamentDetail;
  rankingRefreshKey: number;
  onMatchSaved: () => void;
}) {
  return (
    <section className="grid gap-6">
      <div className="rounded-lg border border-[#d5ddd1] bg-white p-6">
        <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
          Aktives Turnier
        </p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="m-0 text-3xl font-extrabold">{tournament.name}</h2>
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

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          <MatchForm
            participants={tournament.participants}
            tournamentId={tournament.id}
            onMatchSaved={onMatchSaved}
          />
          <RankingBoard
            refreshKey={rankingRefreshKey}
            tournamentId={tournament.id}
          />
        </div>

        <aside className="rounded-lg border border-[#d5ddd1] bg-white p-6">
          <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
            Teilnehmer
          </p>
          <h3 className="m-0 mt-1 text-xl font-bold">Roster</h3>
          <ul className="mt-4 grid list-none gap-2.5 p-0">
            {tournament.participants.map((participant) => (
              <li
                className="grid grid-cols-[40px_1fr] items-center gap-3 rounded-lg border border-[#e2e8df] bg-[#fbfcfa] p-3"
                key={participant.id}
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#2f6f4e] font-extrabold text-white">
                  {participant.user.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong className="block">{participant.user.displayName}</strong>
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
