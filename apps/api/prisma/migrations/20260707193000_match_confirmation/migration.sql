-- Add pending match confirmation workflow.
ALTER TYPE "MatchStatus" ADD VALUE 'PENDING_CONFIRMATION';

ALTER TABLE "Match"
ADD COLUMN "confirmedByUserId" TEXT,
ADD COLUMN "confirmedAt" TIMESTAMP(3);

ALTER TABLE "Match"
ADD CONSTRAINT "Match_confirmedByUserId_fkey"
FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Match_confirmedByUserId_idx" ON "Match"("confirmedByUserId");
