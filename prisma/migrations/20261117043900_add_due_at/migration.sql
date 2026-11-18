-- AlterTable
ALTER TABLE "Card" ADD COLUMN "dueAt" DATETIME;

-- CreateIndex
CREATE INDEX "Card_dueAt_idx" ON "Card"("dueAt");
