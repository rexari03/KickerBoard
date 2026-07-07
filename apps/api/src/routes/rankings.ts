import type { FastifyInstance } from "fastify";
import type { MatchMode } from "@prisma/client";
import { prisma } from "../prisma.js";

type RankingQuery = {
  minMatches?: string;
  mode?: string;
};

type RankingRow = {
  playerId: string;
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

export async function registerRankingRoutes(server: FastifyInstance) {
  server.get<{ Querystring: RankingQuery }>("/rankings", async (request, reply) => {
    const minMatches = parseMinMatches(request.query.minMatches);
    const mode = parseMatchMode(request.query.mode);

    if (request.query.mode && !mode) {
      return reply.code(400).send({
        error: "mode must be ONE_VS_ONE or TWO_VS_TWO when provided"
      });
    }

    const [players, matches] = await Promise.all([
      prisma.playerProfile.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          displayName: "asc"
        },
        select: {
          id: true,
          displayName: true
        }
      }),
      prisma.match.findMany({
        where: {
          status: "COMPLETED",
          ...(mode ? { mode } : {})
        },
        include: {
          teams: {
            include: {
              participants: true
            }
          }
        }
      })
    ]);

    const rows = new Map<string, RankingRow>();

    for (const player of players) {
      rows.set(player.id, {
        playerId: player.id,
        displayName: player.displayName,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifference: 0,
        winRate: 0,
        isQualified: false
      });
    }

    for (const match of matches) {
      const teams = match.teams;

      if (teams.length !== 2) {
        continue;
      }

      const [firstTeam, secondTeam] = teams;

      if (!firstTeam || !secondTeam) {
        continue;
      }

      for (const team of teams) {
        const opponent = team.id === firstTeam.id ? secondTeam : firstTeam;

        for (const participant of team.participants) {
          const row = rows.get(participant.playerId);

          if (!row) {
            continue;
          }

          row.gamesPlayed += 1;
          row.wins += team.isWinner ? 1 : 0;
          row.losses += team.isWinner ? 0 : 1;
          row.pointsFor += team.score;
          row.pointsAgainst += opponent.score;
        }
      }
    }

    const ranking = [...rows.values()]
      .map((row) => {
        const winRate = row.gamesPlayed > 0 ? row.wins / row.gamesPlayed : 0;
        const pointDifference = row.pointsFor - row.pointsAgainst;

        return {
          ...row,
          pointDifference,
          winRate,
          isQualified: row.gamesPlayed >= minMatches
        };
      })
      .sort(compareRankingRows);

    return {
      minMatches,
      mode: mode ?? "OVERALL",
      rows: ranking
    };
  });
}

function compareRankingRows(left: RankingRow, right: RankingRow) {
  return (
    Number(right.isQualified) - Number(left.isQualified) ||
    right.winRate - left.winRate ||
    right.wins - left.wins ||
    right.pointDifference - left.pointDifference ||
    right.gamesPlayed - left.gamesPlayed ||
    left.displayName.localeCompare(right.displayName)
  );
}

function parseMinMatches(value: string | undefined) {
  if (!value) {
    return 5;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 5;
}

function parseMatchMode(value: string | undefined): MatchMode | null {
  if (!value) {
    return null;
  }

  return value === "ONE_VS_ONE" || value === "TWO_VS_TWO" ? value : null;
}
