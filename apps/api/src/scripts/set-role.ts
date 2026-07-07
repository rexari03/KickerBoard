import type { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";

const [, , rawEmail, rawRole] = process.argv;

const email = rawEmail?.trim().toLowerCase();
const role = parseRole(rawRole);

if (!email || !role) {
  console.error(
    "Usage: npm run auth:set-role --workspace @kicker-board/api -- <email> <PLAYER|ADMIN>"
  );
  process.exit(1);
}

try {
  const user = await prisma.user.update({
    where: {
      email
    },
    data: {
      role
    },
    select: {
      email: true,
      role: true
    }
  });

  console.log(`Role for ${user.email} set to ${user.role}.`);
} catch {
  console.error(`Could not set role for ${email}.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

function parseRole(value: string | undefined): UserRole | null {
  if (value === "PLAYER" || value === "ADMIN") {
    return value;
  }

  return null;
}
