import { hashPassword } from "../auth/password.js";
import { prisma } from "../prisma.js";

const [, , rawEmail, rawPassword] = process.argv;

const email = rawEmail?.trim().toLowerCase();
const password = rawPassword;

if (!email || !password) {
  console.error(
    "Usage: npm run auth:reset-password --workspace @kicker-board/api -- <email> <new-password>"
  );
  process.exit(1);
}

if (password.length < 12) {
  console.error("The new password must contain at least 12 characters.");
  process.exit(1);
}

try {
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.update({
    where: {
      email
    },
    data: {
      passwordHash,
      sessions: {
        updateMany: {
          where: {
            revokedAt: null
          },
          data: {
            revokedAt: new Date()
          }
        }
      }
    },
    select: {
      id: true,
      email: true
    }
  });

  console.log(`Password reset for ${user.email}. Active sessions revoked.`);
} catch (error) {
  console.error(`Could not reset password for ${email}.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
