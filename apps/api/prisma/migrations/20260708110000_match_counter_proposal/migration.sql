-- Allow opponents to reject a pending score and propose corrected points.
ALTER TYPE "MatchStatus" ADD VALUE 'PENDING_COUNTER_CONFIRMATION';

ALTER TABLE "Match"
ADD COLUMN "counterProposedByUserId" TEXT,
ADD COLUMN "counterProposedAt" TIMESTAMP(3),
ADD COLUMN "counterReason" TEXT;

ALTER TABLE "Match"
ADD CONSTRAINT "Match_counterProposedByUserId_fkey"
FOREIGN KEY ("counterProposedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Match_counterProposedByUserId_idx" ON "Match"("counterProposedByUserId");
