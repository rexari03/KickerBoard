"use client";

import { useEffect, useMemo, useState } from "react";

type TeamSide = "A" | "B";
type MatchStatus =
  | "PENDING_CONFIRMATION"
  | "PENDING_COUNTER_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLED";

type MatchListUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

type MatchParticipant = {
  tournamentParticipant: {
    user: MatchListUser;
  };
};

type MatchTeam = {
  side: TeamSide;
  score: number;
  isWinner: boolean;
  participants: MatchParticipant[];
};

type MatchItem = {
  id: string;
  mode: "ONE_VS_ONE" | "TWO_VS_TWO";
  status: MatchStatus;
  playedAt: string;
  createdByUserId: string;
  confirmedAt: string | null;
  counterProposedAt: string | null;
  counterReason: string | null;
  createdBy: MatchListUser;
  confirmedBy: MatchListUser | null;
  counterProposedBy: MatchListUser | null;
  teams: MatchTeam[];
};

type CounterProposalForm = {
  scoreA: string;
  scoreB: string;
  reason: string;
};

type MatchListProps = {
  currentUserId: string;
  refreshKey: number;
  tournamentId: string;
  onMatchConfirmed?: () => void;
};

export function MatchList({
  currentUserId,
  refreshKey,
  tournamentId,
  onMatchConfirmed
}: MatchListProps) {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [confirmingMatchId, setConfirmingMatchId] = useState<string | null>(null);
  const [rejectingMatchId, setRejectingMatchId] = useState<string | null>(null);
  const [editingRejectMatchId, setEditingRejectMatchId] = useState<string | null>(null);
  const [counterProposalForms, setCounterProposalForms] = useState<
    Record<string, CounterProposalForm>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadMatches();
  }, [refreshKey, tournamentId]);

  async function loadMatches() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/tournaments/${tournamentId}/matches`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Matches konnten nicht geladen werden.");
      }

      setMatches((await response.json()) as MatchItem[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Matches konnten nicht geladen werden."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmMatch(matchId: string) {
    setConfirmingMatchId(matchId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `${apiUrl}/tournaments/${tournamentId}/matches/${matchId}/confirm`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "Match konnte nicht bestätigt werden.");
      }

      setMessage("Ergebnis bestätigt.");
      await loadMatches();
      onMatchConfirmed?.();
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Match konnte nicht bestätigt werden."
      );
    } finally {
      setConfirmingMatchId(null);
    }
  }

  async function rejectMatch(matchId: string) {
    const form = counterProposalForms[matchId];

    if (!form) {
      return;
    }

    setRejectingMatchId(matchId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `${apiUrl}/tournaments/${tournamentId}/matches/${matchId}/reject`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            scoreA: Number(form.scoreA),
            scoreB: Number(form.scoreB),
            reason: form.reason
          })
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "Gegenvorschlag konnte nicht gespeichert werden.");
      }

      setMessage("Gegenvorschlag gesendet.");
      setEditingRejectMatchId(null);
      await loadMatches();
    } catch (rejectError) {
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : "Gegenvorschlag konnte nicht gespeichert werden."
      );
    } finally {
      setRejectingMatchId(null);
    }
  }

  const latestMatch = matches[0] ?? null;
  const pinnedMatchIds = new Set(
    matches
      .filter(
        (match, index) =>
          index === 0 ||
          canUserConfirmMatch(match, currentUserId) ||
          canUserRejectMatch(match, currentUserId) ||
          editingRejectMatchId === match.id
      )
      .map((match) => match.id)
  );
  const visibleMatches = matches.filter((match) => pinnedMatchIds.has(match.id));
  const historyMatches = matches.filter((match) => !pinnedMatchIds.has(match.id));

  function renderMatchCard(match: MatchItem, label?: string) {
    const teamA = match.teams.find((team) => team.side === "A");
    const teamB = match.teams.find((team) => team.side === "B");
    const canConfirm = canUserConfirmMatch(match, currentUserId);
    const canReject = canUserRejectMatch(match, currentUserId);
    const proposalForm = counterProposalForms[match.id] ?? {
      scoreA: String(teamA?.score ?? ""),
      scoreB: String(teamB?.score ?? ""),
      reason: ""
    };

    return (
      <article
        className="grid min-w-0 gap-4 rounded-lg border border-[#e2e8df] bg-[#fbfcfa] p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        key={match.id}
      >
        <div className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {label ? (
              <span className="rounded-full bg-[#eef3eb] px-3 py-1 text-xs font-bold uppercase text-[#2f6f4e]">
                {label}
              </span>
            ) : null}
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                match.status === "COMPLETED"
                  ? "bg-[#e0f2e8] text-[#2f6f4e]"
                  : match.status === "PENDING_COUNTER_CONFIRMATION"
                    ? "bg-[#e8edf8] text-[#2c4b83]"
                    : "bg-[#fff4d6] text-[#7a5b00]"
              }`}
            >
              {getStatusLabel(match.status)}
            </span>
            <span className="text-sm text-[#667064]">
              {formatDate(match.playedAt)} · eingereicht von{" "}
              {match.createdBy.displayName}
            </span>
          </div>

          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
            <TeamSummary team={teamA} />
            <strong className="text-center text-[#667064]">vs</strong>
            <TeamSummary team={teamB} />
          </div>

          {match.status === "PENDING_COUNTER_CONFIRMATION" ? (
            <p className="m-0 text-sm leading-6 text-[#667064]">
              Gegenvorschlag von {match.counterProposedBy?.displayName ?? "Gegner"}
              {match.counterReason ? `: ${match.counterReason}` : "."}
            </p>
          ) : null}

          {editingRejectMatchId === match.id ? (
            <div className="grid gap-3 rounded-lg border border-[#d5ddd1] bg-white p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  <span>Team A Punkte</span>
                  <input
                    className="w-full rounded-lg border border-[#ccd7c7] bg-white px-3 py-2.5 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
                    inputMode="numeric"
                    min={0}
                    type="number"
                    value={proposalForm.scoreA}
                    onChange={(event) =>
                      setCounterProposalForms((current) => ({
                        ...current,
                        [match.id]: {
                          ...proposalForm,
                          scoreA: event.target.value
                        }
                      }))
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  <span>Team B Punkte</span>
                  <input
                    className="w-full rounded-lg border border-[#ccd7c7] bg-white px-3 py-2.5 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
                    inputMode="numeric"
                    min={0}
                    type="number"
                    value={proposalForm.scoreB}
                    onChange={(event) =>
                      setCounterProposalForms((current) => ({
                        ...current,
                        [match.id]: {
                          ...proposalForm,
                          scoreB: event.target.value
                        }
                      }))
                    }
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold">
                <span>Hinweis</span>
                <input
                  className="w-full rounded-lg border border-[#ccd7c7] bg-white px-3 py-2.5 text-[#172018] outline-[#c8ead8] focus:border-[#2f6f4e] focus:outline-3"
                  value={proposalForm.reason}
                  onChange={(event) =>
                    setCounterProposalForms((current) => ({
                      ...current,
                      [match.id]: {
                        ...proposalForm,
                        reason: event.target.value
                      }
                    }))
                  }
                  placeholder="Optional"
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  className="min-h-10 rounded-lg border border-[#ccd7c7] px-4 py-2 font-extrabold text-[#172018]"
                  type="button"
                  onClick={() => setEditingRejectMatchId(null)}
                >
                  Abbrechen
                </button>
                <button
                  className="min-h-10 rounded-lg bg-[#265c42] px-4 py-2 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65"
                  disabled={rejectingMatchId === match.id}
                  type="button"
                  onClick={() => void rejectMatch(match.id)}
                >
                  {rejectingMatchId === match.id
                    ? "Sendet..."
                    : "Gegenvorschlag senden"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {canConfirm || canReject ? (
          <div className="grid gap-2 lg:w-auto">
            {canConfirm ? (
              <button
                className="min-h-11 w-full cursor-pointer rounded-lg bg-[#265c42] px-4 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65 lg:w-auto"
                disabled={confirmingMatchId === match.id}
                type="button"
                onClick={() => void confirmMatch(match.id)}
              >
                {confirmingMatchId === match.id
                  ? "Bestätigt..."
                  : match.status === "PENDING_COUNTER_CONFIRMATION"
                    ? "Gegenvorschlag bestätigen"
                    : "Ergebnis bestätigen"}
              </button>
            ) : null}
            {canReject ? (
              <button
                className="min-h-11 w-full cursor-pointer rounded-lg border border-[#ccd7c7] bg-white px-4 py-3 font-extrabold text-[#172018] lg:w-auto"
                type="button"
                onClick={() => {
                  setCounterProposalForms((current) => ({
                    ...current,
                    [match.id]: proposalForm
                  }));
                  setEditingRejectMatchId(match.id);
                }}
              >
                Ablehnen und korrigieren
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <section className="min-w-0 rounded-lg border border-[#d5ddd1] bg-white p-4 sm:p-6">
      <div className="grid gap-1.5">
        <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">Matches</p>
        <h2 className="m-0 text-2xl font-extrabold">Ergebnisse</h2>
        <p className="m-0 max-w-2xl text-sm leading-6 text-[#667064]">
          Offene Ergebnisse zählen erst nach Bestätigung durch einen Gegner.
        </p>
      </div>

      {isLoading ? (
        <p className="m-0 mt-4 text-[#667064]">Matches werden geladen...</p>
      ) : null}
      {message ? <p className="m-0 mt-4 font-bold text-[#2f6f4e]">{message}</p> : null}
      {error ? <p className="m-0 mt-4 font-bold text-[#9f2f24]">{error}</p> : null}

      {!isLoading && !error && matches.length === 0 ? (
        <p className="m-0 mt-4 text-[#667064]">Noch keine Matches erfasst.</p>
      ) : null}

      {!isLoading && matches.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {visibleMatches.map((match) =>
            renderMatchCard(match, match.id === latestMatch?.id ? "Neueste" : "Aktion offen")
          )}

          {historyMatches.length > 0 ? (
            <div className="grid gap-3 border-t border-[#e2e8df] pt-3">
              <button
                className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#ccd7c7] bg-white px-4 py-3 text-left font-extrabold text-[#172018]"
                type="button"
                aria-expanded={isHistoryExpanded}
                onClick={() =>
                  setIsHistoryExpanded((currentIsExpanded) => !currentIsExpanded)
                }
              >
                <span>
                  {isHistoryExpanded ? "Verlauf ausblenden" : "Ältere Matches anzeigen"}
                </span>
                <span className="shrink-0 text-sm text-[#667064]">
                  {historyMatches.length}
                </span>
              </button>

              {isHistoryExpanded ? (
                <div className="grid gap-3">
                  {historyMatches.map((match) => renderMatchCard(match))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function TeamSummary({ team }: { team?: MatchTeam }) {
  if (!team) {
    return null;
  }

  return (
    <div className="min-w-0 rounded-lg border border-[#e2e8df] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 font-extrabold">
          Team {team.side}
          {team.isWinner ? " · Sieger" : ""}
        </span>
        <span className="text-2xl font-extrabold">{team.score}</span>
      </div>
      <p className="m-0 mt-2 break-words text-sm text-[#667064]">
        {team.participants
          .map((participant) => participant.tournamentParticipant.user.displayName)
          .join(", ")}
      </p>
    </div>
  );
}

function canUserConfirmMatch(match: MatchItem, currentUserId: string) {
  if (match.status === "PENDING_COUNTER_CONFIRMATION") {
    return match.createdByUserId === currentUserId;
  }

  if (match.status !== "PENDING_CONFIRMATION" || match.createdByUserId === currentUserId) {
    return false;
  }

  const submittingSide = findUserSide(match, match.createdByUserId);
  const currentUserSide = findUserSide(match, currentUserId);

  return Boolean(
    submittingSide && currentUserSide && submittingSide !== currentUserSide
  );
}

function canUserRejectMatch(match: MatchItem, currentUserId: string) {
  if (match.status !== "PENDING_CONFIRMATION" || match.createdByUserId === currentUserId) {
    return false;
  }

  const submittingSide = findUserSide(match, match.createdByUserId);
  const currentUserSide = findUserSide(match, currentUserId);

  return Boolean(
    submittingSide && currentUserSide && submittingSide !== currentUserSide
  );
}

function getStatusLabel(status: MatchStatus) {
  if (status === "COMPLETED") {
    return "Bestätigt";
  }

  if (status === "PENDING_COUNTER_CONFIRMATION") {
    return "Gegenvorschlag offen";
  }

  if (status === "CANCELLED") {
    return "Abgebrochen";
  }

  return "Wartet auf Bestätigung";
}

function findUserSide(match: MatchItem, userId: string) {
  return (
    match.teams.find((team) =>
      team.participants.some(
        (participant) => participant.tournamentParticipant.user.id === userId
      )
    )?.side ?? null
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
