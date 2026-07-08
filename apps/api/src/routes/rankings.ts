import type { FastifyInstance } from "fastify";
import type { MatchMode } from "@prisma/client";
import { requireCurrentUser } from "../auth/guards.js";
import { prisma } from "../prisma.js";

type TournamentParams = {
  tournamentId: string;
};

type RankingQuery = {
  minMatches?: string;
  mode?: string;
};

type RankingRow = {
  participantId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
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
  server.get<{ Params: TournamentParams; Querystring: RankingQuery }>(
    "/tournaments/:tournamentId/rankings",
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);

      if (!user) {
        return;
      }

      const membership = await prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId: request.params.tournamentId,
            userId: user.id
          }
        },
        select: {
          id: true
        }
      });

      if (!membership) {
        return reply.code(403).send({
          error: "tournament membership required"
        });
      }

      const minMatches = parseMinMatches(request.query.minMatches);
      const mode = parseMatchMode(request.query.mode);

      if (request.query.mode && !mode) {
        return reply.code(400).send({
          error: "mode must be ONE_VS_ONE or TWO_VS_TWO when provided"
        });
      }

      const [participants, matches] = await Promise.all([
        prisma.tournamentParticipant.findMany({
          where: {
            tournamentId: request.params.tournamentId
          },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            joinedAt: "asc"
          }
        }),
        prisma.match.findMany({
          where: {
            tournamentId: request.params.tournamentId,
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

      for (const participant of participants) {
        rows.set(participant.id, {
          participantId: participant.id,
          userId: participant.user.id,
          displayName: participant.user.displayName,
          avatarUrl: participant.user.avatarUrl,
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
            const row = rows.get(participant.tournamentParticipantId);

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
    }
  );
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
