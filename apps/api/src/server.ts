import cors from "@fastify/cors";
import Fastify from "fastify";
import { APP_NAME } from "@kicker-board/shared";
import { prisma } from "./prisma.js";
import { registerMatchRoutes } from "./routes/matches.js";
import { registerPlayerRoutes } from "./routes/players.js";
import { registerRankingRoutes } from "./routes/rankings.js";

const server = Fastify({
  logger: true
});

await server.register(cors, {
  origin: true
});

server.get("/health", async () => {
  return {
    app: APP_NAME,
    status: "ok"
  };
});

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
