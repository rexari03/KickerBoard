"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { TournamentParticipant } from "./tournament-dashboard";

type MatchMode = "ONE_VS_ONE" | "TWO_VS_TWO";
type TeamSide = "A" | "B";

type MatchFormState = {
  mode: MatchMode;
  scoreA: string;
  scoreB: string;
  teamA: string[];
  teamB: string[];
};

const initialState: MatchFormState = {
  mode: "ONE_VS_ONE",
  scoreA: "10",
  scoreB: "",
  teamA: [""],
  teamB: [""]
};

type MatchFormProps = {
  participants: TournamentParticipant[];
  tournamentId: string;
  onMatchSaved?: () => void;
};

export function MatchForm({
  participants,
  tournamentId,
  onMatchSaved
}: MatchFormProps) {
  const [form, setForm] = useState<MatchFormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  const playersPerTeam = form.mode === "ONE_VS_ONE" ? 1 : 2;
  const selectedPlayerIds = [...form.teamA, ...form.teamB].filter(Boolean);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validateForm(form, playersPerTeam);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/tournaments/${tournamentId}/matches`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: form.mode,
          teams: [
            {
              side: "A",
              score: Number(form.scoreA),
              participantIds: form.teamA
            },
            {
              side: "B",
              score: Number(form.scoreB),
              participantIds: form.teamB
            }
          ]
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "Match konnte nicht gespeichert werden.");
      }

      setForm((current) => ({
        ...initialState,
        mode: current.mode,
        teamA: emptyTeam(current.mode),
        teamB: emptyTeam(current.mode)
      }));
      setMessage("Ergebnis eingereicht. Der Gegner muss es noch bestätigen.");
      onMatchSaved?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Match konnte nicht gespeichert werden."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleModeChange(mode: MatchMode) {
    setForm((current) => ({
      ...current,
      mode,
      teamA: resizeTeam(current.teamA, mode),
      teamB: resizeTeam(current.teamB, mode)
    }));
  }

  function updateTeamPlayer(side: TeamSide, index: number, playerId: string) {
    setForm((current) => {
      const key = side === "A" ? "teamA" : "teamB";
      const nextTeam = [...current[key]];
      nextTeam[index] = playerId;

      return {
        ...current,
        [key]: nextTeam
      };
    });
  }

  return (
    <section
      className="min-w-0 rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6"
      aria-label="Match erfassen"
    >
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="grid min-w-0 gap-1.5">
            <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">Match</p>
            <h2 className="m-0 text-2xl font-extrabold">Ergebnis erfassen</h2>
            <p className="m-0 max-w-2xl text-sm leading-6 text-[#667064]">
              Wähle Modus, Teams und Punkte. Du musst selbst mitgespielt haben;
              ein Gegner bestätigt das Ergebnis danach.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 rounded-lg bg-[#eef3eb] p-1 sm:w-auto">
            <button
              className={`min-h-10 rounded-md px-4 py-2 font-extrabold ${
                form.mode === "ONE_VS_ONE"
                  ? "bg-white text-[#172018] shadow-sm"
                  : "text-[#667064]"
              }`}
              type="button"
              onClick={() => handleModeChange("ONE_VS_ONE")}
            >
              1v1
            </button>
            <button
              className={`min-h-10 rounded-md px-4 py-2 font-extrabold ${
                form.mode === "TWO_VS_TWO"
                  ? "bg-white text-[#172018] shadow-sm"
                  : "text-[#667064]"
              }`}
              type="button"
              onClick={() => handleModeChange("TWO_VS_TWO")}
            >
              2v2
            </button>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
          <TeamCard
            label="Team A"
            side="A"
            score={form.scoreA}
            selectedPlayerIds={selectedPlayerIds}
            participants={participants}
            team={form.teamA}
            onScoreChange={(score) =>
              setForm((current) => ({ ...current, scoreA: score }))
            }
            onPlayerChange={updateTeamPlayer}
          />

          <div className="grid place-items-center text-sm font-extrabold uppercase text-[#667064]">
            vs
          </div>

          <TeamCard
            label="Team B"
            side="B"
            score={form.scoreB}
            selectedPlayerIds={selectedPlayerIds}
            participants={participants}
            team={form.teamB}
            onScoreChange={(score) =>
              setForm((current) => ({ ...current, scoreB: score }))
            }
            onPlayerChange={updateTeamPlayer}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e2e8df] pt-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="m-0 text-sm text-[#667064]">
              {participants.length} Turnierteilnehmer verfügbar
            </p>
            {message ? <p className="m-0 mt-1 font-bold text-[#2f6f4e]">{message}</p> : null}
            {error ? <p className="m-0 mt-1 font-bold text-[#9f2f24]">{error}</p> : null}
          </div>

          <button
            className="min-h-11 w-full cursor-pointer rounded-lg bg-[#265c42] px-5 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65 md:w-auto"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sendet..." : "Ergebnis einreichen"}
          </button>
        </div>
      </form>
    </section>
  );
}

type TeamCardProps = {
  label: string;
  side: TeamSide;
  score: string;
  selectedPlayerIds: string[];
  participants: TournamentParticipant[];
  team: string[];
  onScoreChange: (score: string) => void;
  onPlayerChange: (side: TeamSide, index: number, playerId: string) => void;
};

function TeamCard({
  label,
  side,
  score,
  selectedPlayerIds,
  participants,
  team,
  onScoreChange,
  onPlayerChange
}: TeamCardProps) {
  return (
    <fieldset className="grid min-w-0 gap-4 rounded-lg border border-[#e2e8df] bg-[#fbfcfa] p-3 sm:p-4">
      <legend className="px-1 font-extrabold text-[#172018]">{label}</legend>

      <label className="grid gap-2 font-bold">
        <span>Punkte</span>
        <input
          className="w-full rounded-lg border border-[#ccd7c7] bg-white px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
          inputMode="numeric"
          min={0}
          required
          type="number"
          value={score}
          onChange={(event) => onScoreChange(event.target.value)}
          placeholder="0"
        />
      </label>

      <div className="grid gap-3">
        {team.map((playerId, index) => (
          <label className="grid gap-2 font-bold" key={`${side}-${index}`}>
            <span>Spieler {index + 1}</span>
            <select
              className="w-full rounded-lg border border-[#ccd7c7] bg-white px-3.5 py-3 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
              required
              value={playerId}
              onChange={(event) => onPlayerChange(side, index, event.target.value)}
            >
              <option value="">Spieler wählen</option>
              {participants.map((participant) => {
                const isSelectedElsewhere =
                  selectedPlayerIds.includes(participant.id) &&
                  participant.id !== playerId;

                return (
                  <option
                    disabled={isSelectedElsewhere}
                    key={participant.id}
                    value={participant.id}
                  >
                    {participant.user.displayName}
                  </option>
                );
              })}
            </select>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function validateForm(form: MatchFormState, playersPerTeam: number) {
  const scoreA = Number(form.scoreA);
  const scoreB = Number(form.scoreB);
  const playerIds = [...form.teamA, ...form.teamB];

  if (
    !Number.isInteger(scoreA) ||
    !Number.isInteger(scoreB) ||
    scoreA < 0 ||
    scoreB < 0
  ) {
    return "Punkte müssen ganze Zahlen ab 0 sein.";
  }

  if (scoreA === scoreB) {
    return "Ein Match darf nicht unentschieden enden.";
  }

  if (form.teamA.length !== playersPerTeam || form.teamB.length !== playersPerTeam) {
    return "Die Teamgröße passt nicht zum Spielmodus.";
  }

  if (playerIds.some((playerId) => !playerId)) {
    return "Bitte alle Spieler auswählen.";
  }

  if (new Set(playerIds).size !== playerIds.length) {
    return "Ein Spieler darf nur einmal im Match vorkommen.";
  }

  return null;
}

function resizeTeam(team: string[], mode: MatchMode) {
  const size = mode === "ONE_VS_ONE" ? 1 : 2;
  return [...team, ""].slice(0, size);
}

function emptyTeam(mode: MatchMode) {
  return mode === "ONE_VS_ONE" ? [""] : ["", ""];
}
