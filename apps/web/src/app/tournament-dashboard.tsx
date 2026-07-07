"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

export type TournamentDetail = TournamentSummary & {
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
  const [createForm, setCreateForm] = useState<TournamentForm>(
    initialTournamentForm
  );
  const [joinPasswords, setJoinPasswords] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadTournaments();
  }, []);

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
      setTournaments(nextTournaments);
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
      setMessage("Turnier erstellt.");
      await loadTournaments();
      router.push(`/tournaments/${tournament.id}`);
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
      setMessage("Turnier beigetreten.");
      await loadTournaments();
      router.push(`/tournaments/${tournamentId}`);
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
      <section className="grid gap-5 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] lg:gap-6">
        <form
          className="grid min-w-0 gap-[18px] rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6"
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

        <section className="min-w-0 rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6">
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
                className={`grid min-w-0 gap-3 rounded-lg border border-[#e2e8df] bg-[#fbfcfa] p-3 transition sm:p-4 ${
                  tournament.isParticipant
                    ? "cursor-pointer hover:border-[#b9cbb1] hover:bg-white hover:shadow-sm focus:outline-none focus:ring-3 focus:ring-[#c8ead8]"
                    : ""
                }`}
                key={tournament.id}
                role={tournament.isParticipant ? "button" : undefined}
                tabIndex={tournament.isParticipant ? 0 : undefined}
                onClick={() => {
                  if (tournament.isParticipant) {
                    router.push(`/tournaments/${tournament.id}`);
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    tournament.isParticipant &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    router.push(`/tournaments/${tournament.id}`);
                  }
                }}
              >
                <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="m-0 break-words text-lg font-extrabold">
                      {tournament.name}
                    </h3>
                    <p className="m-0 mt-1 text-sm text-[#667064]">
                      {tournament.participantCount} Teilnehmer ·{" "}
                      {tournament.matchCount} Matches · Besitzer:{" "}
                      {tournament.owner.displayName}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-[#eef3eb] px-3 py-1 text-xs font-bold uppercase text-[#2f6f4e]">
                    {tournament.isParticipant ? "Beigetreten" : "Offen"}
                  </span>
                </div>

                {!tournament.isParticipant ? (
                  <div
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                    onClick={(event) => event.stopPropagation()}
                  >
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
    </div>
  );
}
