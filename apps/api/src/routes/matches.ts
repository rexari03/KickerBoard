import type { FastifyInstance } from "fastify";
import type { MatchMode, TeamSide } from "@prisma/client";
import { requireCurrentUser } from "../auth/guards.js";
import { prisma } from "../prisma.js";

type TournamentParams = {
  tournamentId: string;
};

type CreateMatchBody = {
  mode?: unknown;
  playedAt?: unknown;
  teams?: unknown;
};

type ParsedTeam = {
  side: TeamSide;
  score: number;
  isWinner: boolean;
  participantIds: string[];
};

export async function registerMatchRoutes(server: FastifyInstance) {
  server.get<{ Params: TournamentParams }>(
    "/tournaments/:tournamentId/matches",
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);

      if (!user) {
        return;
      }

      const membership = await findTournamentMembership(
        request.params.tournamentId,
        user.id
      );

      if (!membership) {
        return reply.code(403).send({
          error: "tournament membership required"
        });
      }

      return prisma.match.findMany({
        where: {
          tournamentId: request.params.tournamentId
        },
        orderBy: {
          playedAt: "desc"
        },
        include: {
          createdBy: {
            select: {
              id: true,
              displayName: true
            }
          },
          teams: {
            orderBy: {
              side: "asc"
            },
            include: {
              participants: {
                include: {
                  tournamentParticipant: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          displayName: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }
  );

  server.post<{ Params: TournamentParams; Body: CreateMatchBody }>(
    "/tournaments/:tournamentId/matches",
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);

      if (!user) {
        return;
      }

      const membership = await findTournamentMembership(
        request.params.tournamentId,
        user.id
      );

      if (!membership) {
        return reply.code(403).send({
          error: "tournament membership required"
        });
      }

      const validation = validateCreateMatch(request.body);

      if (!validation.ok) {
        return reply.code(400).send({
          error: validation.error
        });
      }

      const { mode, playedAt, teams } = validation.data;
      const participantIds = teams.flatMap((team) => team.participantIds);

      const existingParticipants = await prisma.tournamentParticipant.findMany({
        where: {
          id: {
            in: participantIds
          },
          tournamentId: request.params.tournamentId
        },
        select: {
          id: true
        }
      });

      const existingParticipantIds = new Set(
        existingParticipants.map((participant) => participant.id)
      );
      const missingParticipantIds = participantIds.filter(
        (participantId) => !existingParticipantIds.has(participantId)
      );

      if (missingParticipantIds.length > 0) {
        return reply.code(400).send({
          error: "all participants must belong to this tournament",
          missingParticipantIds
        });
      }

      const match = await prisma.match.create({
        data: {
          tournamentId: request.params.tournamentId,
          mode,
          playedAt,
          createdByUserId: user.id,
          teams: {
            create: teams.map((team) => ({
              side: team.side,
              score: team.score,
              isWinner: team.isWinner,
              participants: {
                create: team.participantIds.map((tournamentParticipantId) => ({
                  tournamentParticipantId
                }))
              }
            }))
          }
        },
        include: {
          teams: {
            orderBy: {
              side: "asc"
            },
            include: {
              participants: {
                include: {
                  tournamentParticipant: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          displayName: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      return reply.code(201).send(match);
    }
  );
}

async function findTournamentMembership(tournamentId: string, userId: string) {
  return prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId,
        userId
      }
    },
    select: {
      id: true
    }
  });
}

function validateCreateMatch(body: CreateMatchBody):
  | {
      ok: true;
      data: {
        mode: MatchMode;
        playedAt: Date;
        teams: ParsedTeam[];
      };
    }
  | { ok: false; error: string } {
  const mode = parseMatchMode(body.mode);
  const playedAt = parseDate(body.playedAt);

  if (!mode) {
    return { ok: false, error: "mode must be ONE_VS_ONE or TWO_VS_TWO" };
  }

  if (!playedAt) {
    return { ok: false, error: "playedAt must be a valid date when provided" };
  }

  if (!Array.isArray(body.teams) || body.teams.length !== 2) {
    return { ok: false, error: "teams must contain exactly two teams" };
  }

  const parsedTeams = body.teams.map(parseTeam);

  if (parsedTeams.some((team) => !team)) {
    return {
      ok: false,
      error: "each team requires side, score and participantIds"
    };
  }

  const teams = parsedTeams.filter((team): team is ParsedTeam => Boolean(team));
  const sides = new Set(teams.map((team) => team.side));

  if (!sides.has("A") || !sides.has("B")) {
    return { ok: false, error: "teams must include side A and side B" };
  }

  const expectedPlayersPerTeam = mode === "ONE_VS_ONE" ? 1 : 2;

  if (teams.some((team) => team.participantIds.length !== expectedPlayersPerTeam)) {
    return {
      ok: false,
      error: `${mode} requires ${expectedPlayersPerTeam} participant(s) per team`
    };
  }

  const participantIds = teams.flatMap((team) => team.participantIds);

  if (new Set(participantIds).size !== participantIds.length) {
    return { ok: false, error: "a participant can only play once per match" };
  }

  const [teamA, teamB] = [...teams].sort((left, right) =>
    left.side.localeCompare(right.side)
  );

  if (!teamA || !teamB || teamA.score === teamB.score) {
    return { ok: false, error: "matches cannot end in a draw" };
  }

  const winnerSide = teamA.score > teamB.score ? "A" : "B";
  const teamsWithWinner = teams.map((team) => ({
    ...team,
    isWinner: team.side === winnerSide
  }));

  return {
    ok: true,
    data: {
      mode,
      playedAt,
      teams: teamsWithWinner
    }
  };
}

function parseTeam(value: unknown): ParsedTeam | null {
  if (!isRecord(value)) {
    return null;
  }

  const side = parseTeamSide(value.side);
  const score = parseScore(value.score);
  const participantIds = parseStringArray(value.participantIds);

  if (!side || score === null || !participantIds) {
    return null;
  }

  return {
    side,
    score,
    isWinner: false,
    participantIds
  };
}

function parseMatchMode(value: unknown): MatchMode | null {
  return value === "ONE_VS_ONE" || value === "TWO_VS_TWO" ? value : null;
}

function parseTeamSide(value: unknown): TeamSide | null {
  return value === "A" || value === "B" ? value : null;
}

function parseScore(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const strings = value
    .map(normalizeString)
    .filter((item): item is string => Boolean(item));

  return strings.length === value.length ? strings : null;
}

function parseDate(value: unknown) {
  if (value === undefined || value === null) {
    return new Date();
  }

  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
