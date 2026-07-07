import type { FastifyInstance } from "fastify";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { requireCurrentUser } from "../auth/guards.js";
import { prisma } from "../prisma.js";

type CreateTournamentBody = {
  name?: unknown;
  password?: unknown;
};

type JoinTournamentBody = {
  password?: unknown;
};

type TournamentParams = {
  tournamentId: string;
};

export async function registerTournamentRoutes(server: FastifyInstance) {
  server.get("/tournaments", async (request, reply) => {
    const user = await requireCurrentUser(request, reply);

    if (!user) {
      return;
    }

    const tournaments = await prisma.tournament.findMany({
      where: {
        status: "ACTIVE"
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true
          }
        },
        participants: {
          select: {
            userId: true
          }
        },
        _count: {
          select: {
            participants: true,
            matches: true
          }
        }
      }
    });

    return tournaments.map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      status: tournament.status,
      owner: tournament.owner,
      participantCount: tournament._count.participants,
      matchCount: tournament._count.matches,
      isOwner: tournament.ownerUserId === user.id,
      isParticipant: tournament.participants.some(
        (participant) => participant.userId === user.id
      ),
      createdAt: tournament.createdAt,
      updatedAt: tournament.updatedAt
    }));
  });

  server.post<{ Body: CreateTournamentBody }>(
    "/tournaments",
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);

      if (!user) {
        return;
      }

      const name = normalizeString(request.body.name);
      const password = normalizePassword(request.body.password);

      if (!name || !password) {
        return reply.code(400).send({
          error: "name and password are required"
        });
      }

      const slug = await createUniqueTournamentSlug(name);
      const passwordHash = await hashPassword(password);

      const tournament = await prisma.tournament.create({
        data: {
          name,
          slug,
          passwordHash,
          ownerUserId: user.id,
          participants: {
            create: {
              userId: user.id,
              role: "MANAGER"
            }
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true
            }
          },
          _count: {
            select: {
              participants: true,
              matches: true
            }
          }
        }
      });

      return reply.code(201).send(toTournamentDto(tournament, user.id));
    }
  );

  server.get<{ Params: TournamentParams }>(
    "/tournaments/:tournamentId",
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);

      if (!user) {
        return;
      }

      const tournament = await prisma.tournament.findUnique({
        where: {
          id: request.params.tournamentId
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true
            }
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              matches: true
            }
          }
        }
      });

      if (!tournament) {
        return reply.code(404).send({
          error: "tournament not found"
        });
      }

      const isParticipant = tournament.participants.some(
        (participant) => participant.userId === user.id
      );

      if (!isParticipant && user.role !== "ADMIN") {
        return reply.code(403).send({
          error: "tournament membership required"
        });
      }

      return {
        ...toTournamentDto(tournament, user.id),
        isParticipant,
        participants: tournament.participants.map((participant) => ({
          id: participant.id,
          role: participant.role,
          joinedAt: participant.joinedAt,
          user: participant.user
        }))
      };
    }
  );

  server.post<{ Params: TournamentParams; Body: JoinTournamentBody }>(
    "/tournaments/:tournamentId/join",
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);

      if (!user) {
        return;
      }

      const password = normalizePassword(request.body.password);

      if (!password) {
        return reply.code(400).send({
          error: "password is required"
        });
      }

      const tournament = await prisma.tournament.findUnique({
        where: {
          id: request.params.tournamentId
        }
      });

      if (!tournament || tournament.status !== "ACTIVE") {
        return reply.code(404).send({
          error: "tournament not found"
        });
      }

      const isValidPassword = await verifyPassword(password, tournament.passwordHash);

      if (!isValidPassword) {
        return reply.code(401).send({
          error: "invalid tournament password"
        });
      }

      const participant = await prisma.tournamentParticipant.upsert({
        where: {
          tournamentId_userId: {
            tournamentId: tournament.id,
            userId: user.id
          }
        },
        update: {},
        create: {
          tournamentId: tournament.id,
          userId: user.id
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true
            }
          }
        }
      });

      return reply.code(201).send({
        id: participant.id,
        role: participant.role,
        joinedAt: participant.joinedAt,
        user: participant.user
      });
    }
  );
}

function toTournamentDto(
  tournament: {
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "ARCHIVED";
    ownerUserId: string;
    owner: {
      id: string;
      displayName: string;
    };
    _count: {
      participants?: number;
      matches: number;
    };
    createdAt: Date;
    updatedAt: Date;
  },
  currentUserId: string
) {
  return {
    id: tournament.id,
    name: tournament.name,
    slug: tournament.slug,
    status: tournament.status,
    owner: tournament.owner,
    participantCount: tournament._count.participants ?? 0,
    matchCount: tournament._count.matches,
    isOwner: tournament.ownerUserId === currentUserId,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt
  };
}

async function createUniqueTournamentSlug(name: string) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 2;

  while (await prisma.tournament.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "turnier";
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePassword(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return value.length >= 6 ? value : null;
}
