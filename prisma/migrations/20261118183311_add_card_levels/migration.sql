-- CreateTable
CREATE TABLE "CardLevel" (
    "cardId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "crossesAt" DATETIME NOT NULL,

    PRIMARY KEY ("cardId", "level"),
    CONSTRAINT "CardLevel_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CardLevel_level_crossesAt_idx" ON "CardLevel"("level", "crossesAt");
