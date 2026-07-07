import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type RateLimitRule = {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;

const globalRule: RateLimitRule = {
  keyPrefix: "global",
  maxRequests: parsePositiveInteger(process.env.RATE_LIMIT_GLOBAL_MAX, 300),
  windowMs: parsePositiveInteger(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, minuteMs)
};

const authLoginRule: RateLimitRule = {
  keyPrefix: "auth-login",
  maxRequests: parsePositiveInteger(process.env.RATE_LIMIT_LOGIN_MAX, 10),
  windowMs: parsePositiveInteger(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * minuteMs)
};

const authRegisterRule: RateLimitRule = {
  keyPrefix: "auth-register",
  maxRequests: parsePositiveInteger(process.env.RATE_LIMIT_REGISTER_MAX, 5),
  windowMs: parsePositiveInteger(process.env.RATE_LIMIT_REGISTER_WINDOW_MS, hourMs)
};

const tournamentJoinRule: RateLimitRule = {
  keyPrefix: "tournament-join",
  maxRequests: parsePositiveInteger(process.env.RATE_LIMIT_TOURNAMENT_JOIN_MAX, 20),
  windowMs: parsePositiveInteger(
    process.env.RATE_LIMIT_TOURNAMENT_JOIN_WINDOW_MS,
    15 * minuteMs
  )
};

const writeRule: RateLimitRule = {
  keyPrefix: "write",
  maxRequests: parsePositiveInteger(process.env.RATE_LIMIT_WRITE_MAX, 80),
  windowMs: parsePositiveInteger(process.env.RATE_LIMIT_WRITE_WINDOW_MS, minuteMs)
};

export async function registerRateLimit(server: FastifyInstance) {
  server.addHook("onRequest", async (request, reply) => {
    if (shouldSkipRateLimit(request)) {
      return;
    }

    const now = Date.now();
    const rules = getRulesForRequest(request);

    cleanupExpiredBuckets(now);

    for (const rule of rules) {
      const result = consumeRequest(rule, request.ip, now);
      setRateLimitHeaders(reply, rule, result.bucket);

      if (!result.allowed) {
        const retryAfterSeconds = Math.ceil((result.bucket.resetAt - now) / 1000);

        reply.header("Retry-After", retryAfterSeconds.toString());
        return reply.code(429).send({
          error: "too many requests",
          retryAfterSeconds
        });
      }
    }
  });
}

function getRulesForRequest(request: FastifyRequest) {
  const path = getPath(request);
  const rules = [globalRule];

  if (request.method === "POST" && path === "/auth/login") {
    rules.push(authLoginRule);
  }

  if (request.method === "POST" && path === "/auth/register") {
    rules.push(authRegisterRule);
  }

  if (request.method === "POST" && /^\/tournaments\/[^/]+\/join$/.test(path)) {
    rules.push(tournamentJoinRule);
  }

  if (["PATCH", "POST", "PUT", "DELETE"].includes(request.method)) {
    rules.push(writeRule);
  }

  return rules;
}

function consumeRequest(rule: RateLimitRule, clientIp: string, now: number) {
  const key = `${rule.keyPrefix}:${clientIp}`;
  const currentBucket = buckets.get(key);

  if (!currentBucket || currentBucket.resetAt <= now) {
    const bucket = {
      count: 1,
      resetAt: now + rule.windowMs
    };

    buckets.set(key, bucket);

    return {
      allowed: true,
      bucket
    };
  }

  currentBucket.count += 1;

  return {
    allowed: currentBucket.count <= rule.maxRequests,
    bucket: currentBucket
  };
}

function setRateLimitHeaders(
  reply: FastifyReply,
  rule: RateLimitRule,
  bucket: RateLimitBucket
) {
  reply.header("X-RateLimit-Limit", rule.maxRequests.toString());
  reply.header(
    "X-RateLimit-Remaining",
    Math.max(rule.maxRequests - bucket.count, 0).toString()
  );
  reply.header("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1000).toString());
}

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function shouldSkipRateLimit(request: FastifyRequest) {
  return request.method === "OPTIONS" || getPath(request) === "/health";
}

function getPath(request: FastifyRequest) {
  return request.url.split("?")[0] ?? request.url;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
