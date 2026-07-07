"use client";

import { useEffect, useMemo, useState } from "react";

type RankingMode = "OVERALL" | "ONE_VS_ONE" | "TWO_VS_TWO";

type RankingRow = {
  participantId: string;
  userId: string;
  displayName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  winRate: number;
  isQualified: boolean;
};

type RankingResponse = {
  minMatches: number;
  mode: RankingMode;
  rows: RankingRow[];
};

type RankingBoardProps = {
  refreshKey: number;
  tournamentId: string;
};

const modes: Array<{ label: string; value: RankingMode }> = [
  { label: "Gesamt", value: "OVERALL" },
  { label: "1v1", value: "ONE_VS_ONE" },
  { label: "2v2", value: "TWO_VS_TWO" }
];

export function RankingBoard({ refreshKey, tournamentId }: RankingBoardProps) {
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [mode, setMode] = useState<RankingMode>("OVERALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  useEffect(() => {
    void loadRanking();
  }, [mode, refreshKey]);

  async function loadRanking() {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        minMatches: "5"
      });

      if (mode !== "OVERALL") {
        params.set("mode", mode);
      }

      const response = await fetch(
        `${apiUrl}/tournaments/${tournamentId}/rankings?${params.toString()}`,
        {
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Ranking konnte nicht geladen werden.");
      }

      setRanking((await response.json()) as RankingResponse);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Ranking konnte nicht geladen werden."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const rows = ranking?.rows ?? [];
  const qualifiedRows = rows.filter((row) => row.isQualified);
  const leader = qualifiedRows[0] ?? rows[0];

  return (
    <section
      className="overflow-hidden rounded-lg border border-[#d5ddd1] bg-white"
      aria-label="Ranking Board"
    >
      <div className="grid gap-5 border-b border-[#e2e8df] bg-[#fbfcfa] p-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="grid gap-1.5">
          <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">Ranking</p>
          <h2 className="m-0 text-2xl font-extrabold">Scoreboard</h2>
          <p className="m-0 max-w-2xl text-sm leading-6 text-[#667064]">
            Sortiert nach Siegquote. Spieler sind ab {ranking?.minMatches ?? 5}{" "}
            Spielen für das Haupt-Ranking qualifiziert.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#eef3eb] p-1">
          {modes.map((item) => (
            <button
              className={`min-h-10 rounded-md px-3 py-2 text-sm font-extrabold ${
                mode === item.value
                  ? "bg-white text-[#172018] shadow-sm"
                  : "text-[#667064]"
              }`}
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {leader ? (
        <div className="grid gap-4 border-b border-[#e2e8df] p-6 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-lg bg-[#265c42] p-5 text-white">
            <p className="m-0 text-xs font-bold uppercase text-[#c8ead8]">
              Führung
            </p>
            <h3 className="m-0 mt-3 text-3xl font-extrabold">
              {leader.displayName}
            </h3>
            <p className="m-0 mt-2 text-[#dcece3]">
              {formatPercent(leader.winRate)} Siegquote
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Spiele" value={leader.gamesPlayed.toString()} />
            <StatCard label="Siege" value={leader.wins.toString()} />
            <StatCard label="Punktdiff." value={formatDiff(leader.pointDifference)} />
          </div>
        </div>
      ) : null}

      <div className="p-6">
        {isLoading ? (
          <p className="m-0 text-[#667064]">Ranking wird geladen...</p>
        ) : null}

        {error ? <p className="m-0 font-bold text-[#9f2f24]">{error}</p> : null}

        {!isLoading && !error && rows.length === 0 ? (
          <p className="m-0 text-[#667064]">Noch keine Spieler im Ranking.</p>
        ) : null}

        {!isLoading && !error && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-xs font-bold uppercase text-[#667064]">
                  <th className="px-3 py-2">Rang</th>
                  <th className="px-3 py-2">Spieler</th>
                  <th className="px-3 py-2 text-right">Quote</th>
                  <th className="px-3 py-2 text-right">Spiele</th>
                  <th className="px-3 py-2 text-right">S</th>
                  <th className="px-3 py-2 text-right">N</th>
                  <th className="px-3 py-2 text-right">Punkte</th>
                  <th className="px-3 py-2 text-right">Diff.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    className={`rounded-lg ${
                      row.isQualified ? "bg-[#fbfcfa]" : "bg-[#f3f5f1]"
                    }`}
                    key={row.participantId}
                  >
                    <td className="rounded-l-lg px-3 py-3 font-extrabold">
                      #{index + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#2f6f4e] font-extrabold text-white">
                          {row.displayName.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <strong className="block">{row.displayName}</strong>
                          <small className="block text-[#667064]">
                            {row.isQualified
                              ? "Qualifiziert"
                              : "Noch nicht qualifiziert"}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-extrabold">
                      {formatPercent(row.winRate)}
                    </td>
                    <td className="px-3 py-3 text-right">{row.gamesPlayed}</td>
                    <td className="px-3 py-3 text-right">{row.wins}</td>
                    <td className="px-3 py-3 text-right">{row.losses}</td>
                    <td className="px-3 py-3 text-right">
                      {row.pointsFor}:{row.pointsAgainst}
                    </td>
                    <td className="rounded-r-lg px-3 py-3 text-right font-bold">
                      {formatDiff(row.pointDifference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e2e8df] bg-[#fbfcfa] p-4">
      <p className="m-0 text-xs font-bold uppercase text-[#667064]">{label}</p>
      <p className="m-0 mt-2 text-3xl font-extrabold text-[#172018]">{value}</p>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDiff(value: number) {
  return value > 0 ? `+${value}` : value.toString();
}
