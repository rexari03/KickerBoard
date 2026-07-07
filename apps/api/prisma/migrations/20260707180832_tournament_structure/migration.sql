/*
  Warnings:

  - The values [PLAYER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `seasonId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `playerId` on the `MatchParticipant` table. All the data in the column will be lost.
  - You are about to drop the `PlayerProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RatingSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Season` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[matchTeamId,tournamentParticipantId]` on the table `MatchParticipant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tournamentId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tournamentParticipantId` to the `MatchParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TournamentParticipantRole" AS ENUM ('PLAYER', 'MANAGER');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_seasonId_fkey";

-- DropForeignKey
ALTER TABLE "MatchParticipant" DROP CONSTRAINT "MatchParticipant_playerId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerProfile" DROP CONSTRAINT "PlayerProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "RatingSnapshot" DROP CONSTRAINT "RatingSnapshot_playerId_fkey";

-- DropForeignKey
ALTER TABLE "RatingSnapshot" DROP CONSTRAINT "RatingSnapshot_seasonId_fkey";

-- DropIndex
DROP INDEX "Match_seasonId_idx";

-- DropIndex
DROP INDEX "MatchParticipant_matchTeamId_playerId_key";

-- DropIndex
DROP INDEX "MatchParticipant_playerId_idx";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "seasonId",
ADD COLUMN     "tournamentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MatchParticipant" DROP COLUMN "playerId",
ADD COLUMN     "tournamentParticipantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'USER';

-- DropTable
DROP TABLE "PlayerProfile";

-- DropTable
DROP TABLE "RatingSnapshot";

-- DropTable
DROP TABLE "Season";

-- DropEnum
DROP TYPE "RatingScope";

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentParticipant" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TournamentParticipantRole" NOT NULL DEFAULT 'PLAYER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- CreateIndex
CREATE INDEX "Tournament_ownerUserId_idx" ON "Tournament"("ownerUserId");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "TournamentParticipant_userId_idx" ON "TournamentParticipant"("userId");

-- CreateIndex
CREATE INDEX "TournamentParticipant_tournamentId_idx" ON "TournamentParticipant"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_userId_key" ON "TournamentParticipant"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "MatchParticipant_tournamentParticipantId_idx" ON "MatchParticipant"("tournamentParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchTeamId_tournamentParticipantId_key" ON "MatchParticipant"("matchTeamId", "tournamentParticipantId");

-- CreateIndex
CREATE INDEX "User_displayName_idx" ON "User"("displayName");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_tournamentParticipantId_fkey" FOREIGN KEY ("tournamentParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
