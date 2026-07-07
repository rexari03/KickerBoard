import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { APP_NAME } from "@kicker-board/shared";
import { prisma } from "./prisma.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerMatchRoutes } from "./routes/matches.js";
import { registerPlayerRoutes } from "./routes/players.js";
import { registerRankingRoutes } from "./routes/rankings.js";
import { registerTournamentRoutes } from "./routes/tournaments.js";
import { registerRateLimit } from "./security/rate-limit.js";

const trustProxy = process.env.TRUST_PROXY === "true";

const server = Fastify({
  logger: true,
  trustProxy
});

const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

await server.register(cookie);

await server.register(cors, {
  origin: frontendOrigin,
  credentials: true
});

await registerRateLimit(server);

server.get("/health", async () => {
  return {
    app: APP_NAME,
    status: "ok"
  };
});

await server.register(registerAuthRoutes);
await server.register(registerTournamentRoutes);
await server.register(registerPlayerRoutes);
await server.register(registerMatchRoutes);
await server.register(registerRankingRoutes);

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

const shutdown = async () => {
  await server.close();
  await prisma.$disconnect();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
