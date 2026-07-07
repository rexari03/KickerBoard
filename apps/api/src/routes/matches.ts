import type { FastifyInstance } from "fastify";
import type { MatchMode, TeamSide } from "@prisma/client";
import { prisma } from "../prisma.js";

type CreateMatchBody = {
  mode?: unknown;
  playedAt?: unknown;
  createdByUserId?: unknown;
  seasonId?: unknown;
  teams?: unknown;
};

type ParsedTeam = {
  side: TeamSide;
  score: number;
  isWinner: boolean;
  playerIds: string[];
};

export async function registerMatchRoutes(server: FastifyInstance) {
  server.get("/matches", async () => {
    return prisma.match.findMany({
      orderBy: {
        playedAt: "desc"
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true
          }
        },
        teams: {
          orderBy: {
            side: "asc"
          },
          include: {
            participants: {
              include: {
                player: true
              }
            }
          }
        }
      }
    });
  });

  server.post<{ Body: CreateMatchBody }>("/matches", async (request, reply) => {
    const validation = validateCreateMatch(request.body);

    if (!validation.ok) {
      return reply.code(400).send({
        error: validation.error
      });
    }

    const { createdByUserId, mode, playedAt, seasonId, teams } = validation.data;

    const existingPlayers = await prisma.playerProfile.findMany({
      where: {
        id: {
          in: teams.flatMap((team) => team.playerIds)
        },
        isActive: true
      },
      select: {
        id: true
      }
    });

    const existingPlayerIds = new Set(existingPlayers.map((player) => player.id));
    const missingPlayerIds = teams
      .flatMap((team) => team.playerIds)
      .filter((playerId) => !existingPlayerIds.has(playerId));

    if (missingPlayerIds.length > 0) {
      return reply.code(400).send({
        error: "all players must exist and be active",
        missingPlayerIds
      });
    }

    const createdBy = await prisma.user.findUnique({
      where: {
        id: createdByUserId
      },
      select: {
        id: true
      }
    });

    if (!createdBy) {
      return reply.code(400).send({
        error: "createdByUserId must reference an existing user"
      });
    }

    const match = await prisma.match.create({
      data: {
        mode,
        playedAt,
        createdByUserId,
        seasonId,
        teams: {
          create: teams.map((team) => ({
            side: team.side,
            score: team.score,
            isWinner: team.isWinner,
            participants: {
              create: team.playerIds.map((playerId) => ({
                playerId
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
                player: true
              }
            }
          }
        }
      }
    });

    return reply.code(201).send(match);
  });
}

function validateCreateMatch(body: CreateMatchBody):
  | {
      ok: true;
      data: {
        mode: MatchMode;
        playedAt: Date;
        createdByUserId: string;
        seasonId?: string;
        teams: ParsedTeam[];
      };
    }
  | { ok: false; error: string } {
  const mode = parseMatchMode(body.mode);
  const createdByUserId = normalizeString(body.createdByUserId);
  const seasonId = normalizeString(body.seasonId);
  const playedAt = parseDate(body.playedAt);

  if (!mode) {
    return { ok: false, error: "mode must be ONE_VS_ONE or TWO_VS_TWO" };
  }

  if (!createdByUserId) {
    return { ok: false, error: "createdByUserId is required" };
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
      error: "each team requires side, score and playerIds"
    };
  }

  const teams = parsedTeams.filter((team): team is ParsedTeam => Boolean(team));
  const sides = new Set(teams.map((team) => team.side));

  if (!sides.has("A") || !sides.has("B")) {
    return { ok: false, error: "teams must include side A and side B" };
  }

  const expectedPlayersPerTeam = mode === "ONE_VS_ONE" ? 1 : 2;

  if (teams.some((team) => team.playerIds.length !== expectedPlayersPerTeam)) {
    return {
      ok: false,
      error: `${mode} requires ${expectedPlayersPerTeam} player(s) per team`
    };
  }

  const playerIds = teams.flatMap((team) => team.playerIds);

  if (new Set(playerIds).size !== playerIds.length) {
    return { ok: false, error: "a player can only participate once per match" };
  }

  const [teamA, teamB] = teams.sort((left, right) =>
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
      createdByUserId,
      ...(seasonId ? { seasonId } : {}),
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
  const playerIds = parsePlayerIds(value.playerIds);

  if (!side || score === null || !playerIds) {
    return null;
  }

  return {
    side,
    score,
    isWinner: false,
    playerIds
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

function parsePlayerIds(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const playerIds = value
    .map(normalizeString)
    .filter((playerId): playerId is string => Boolean(playerId));

  return playerIds.length === value.length ? playerIds : null;
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
