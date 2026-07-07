import type { FastifyInstance } from "fastify";
import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  clearSessionCookie,
  createSession,
  getCurrentSession,
  setSessionCookie,
  revokeCurrentSession
} from "../auth/session.js";
import { prisma } from "../prisma.js";

type AuthBody = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
};

type UpdateMeBody = {
  displayName?: unknown;
};

type UpdatePasswordBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

export async function registerAuthRoutes(server: FastifyInstance) {
  server.post<{ Body: AuthBody }>("/auth/register", async (request, reply) => {
    const email = normalizeEmail(request.body.email);
    const password = normalizePassword(request.body.password);
    const displayName = normalizeString(request.body.displayName);

    if (!email || !password || !displayName) {
      return reply.code(400).send({
        error: "email, password and displayName are required"
      });
    }

    const passwordHash = await hashPassword(password);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          displayName,
          passwordHash
        }
      });

      const token = await createSession(request, user.id);
      setSessionCookie(reply, token);

      return reply.code(201).send(toAuthUser(user));
    } catch {
      return reply.code(409).send({
        error: "email already exists"
      });
    }
  });

  server.post<{ Body: AuthBody }>("/auth/login", async (request, reply) => {
    const email = normalizeEmail(request.body.email);
    const password = normalizePassword(request.body.password);

    if (!email || !password) {
      return reply.code(400).send({
        error: "email and password are required"
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!user?.passwordHash) {
      return reply.code(401).send({
        error: "invalid email or password"
      });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return reply.code(401).send({
        error: "invalid email or password"
      });
    }

    const token = await createSession(request, user.id);
    setSessionCookie(reply, token);

    return toAuthUser(user);
  });

  server.get("/auth/me", async (request, reply) => {
    const session = await getCurrentSession(request);

    if (!session) {
      return reply.code(401).send({
        error: "not authenticated"
      });
    }

    return toAuthUser(session.user);
  });

  server.patch<{ Body: UpdateMeBody }>("/auth/me", async (request, reply) => {
    const session = await getCurrentSession(request);

    if (!session) {
      return reply.code(401).send({
        error: "not authenticated"
      });
    }

    const displayName = normalizeString(request.body.displayName);

    if (!displayName) {
      return reply.code(400).send({
        error: "displayName is required"
      });
    }

    const user = await prisma.user.update({
      where: {
        id: session.user.id
      },
      data: {
        displayName
      }
    });

    return toAuthUser(user);
  });

  server.patch<{ Body: UpdatePasswordBody }>(
    "/auth/me/password",
    async (request, reply) => {
      const session = await getCurrentSession(request);

      if (!session) {
        return reply.code(401).send({
          error: "not authenticated"
        });
      }

      const currentPassword = normalizePassword(request.body.currentPassword);
      const newPassword = normalizePassword(request.body.newPassword);

      if (!currentPassword || !newPassword) {
        return reply.code(400).send({
          error: "currentPassword and newPassword are required"
        });
      }

      if (!session.user.passwordHash) {
        return reply.code(400).send({
          error: "password cannot be changed for this account"
        });
      }

      const isCurrentPasswordValid = await verifyPassword(
        currentPassword,
        session.user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        return reply.code(401).send({
          error: "invalid current password"
        });
      }

      const passwordHash = await hashPassword(newPassword);

      await prisma.user.update({
        where: {
          id: session.user.id
        },
        data: {
          passwordHash
        }
      });

      await prisma.session.updateMany({
        where: {
          userId: session.user.id,
          id: {
            not: session.id
          },
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });

      return {
        ok: true
      };
    }
  );

  server.get("/auth/me/stats", async (request, reply) => {
    const session = await getCurrentSession(request);

    if (!session) {
      return reply.code(401).send({
        error: "not authenticated"
      });
    }

    const [ownedTournamentCount, memberships, matchParticipations] =
      await Promise.all([
        prisma.tournament.count({
          where: {
            ownerUserId: session.user.id
          }
        }),
        prisma.tournamentParticipant.findMany({
          where: {
            userId: session.user.id
          },
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                updatedAt: true,
                _count: {
                  select: {
                    participants: true,
                    matches: true
                  }
                }
              }
            }
          },
          orderBy: {
            joinedAt: "desc"
          }
        }),
        prisma.matchParticipant.findMany({
          where: {
            tournamentParticipant: {
              userId: session.user.id
            },
            matchTeam: {
              match: {
                status: "COMPLETED"
              }
            }
          },
          include: {
            matchTeam: {
              include: {
                match: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        })
      ]);

    const uniqueMatchIds = new Set(
      matchParticipations.map(
        (participation) => participation.matchTeam.match.id
      )
    );
    const wins = matchParticipations.filter(
      (participation) => participation.matchTeam.isWinner
    ).length;
    const gamesPlayed = uniqueMatchIds.size;

    return {
      ownedTournamentCount,
      joinedTournamentCount: memberships.length,
      gamesPlayed,
      wins,
      losses: Math.max(gamesPlayed - wins, 0),
      winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
      recentTournaments: memberships.slice(0, 4).map((membership) => ({
        id: membership.tournament.id,
        name: membership.tournament.name,
        participantCount: membership.tournament._count.participants,
        matchCount: membership.tournament._count.matches,
        updatedAt: membership.tournament.updatedAt
      }))
    };
  });

  server.post("/auth/logout", async (request, reply) => {
    await revokeCurrentSession(request);
    clearSessionCookie(reply);

    return {
      ok: true
    };
  });
}

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    profile: {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: null
    }
  };
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeString(value)?.toLowerCase();
  return normalized && normalized.includes("@") ? normalized : null;
}

function normalizePassword(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return value.length >= 12 ? value : null;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
