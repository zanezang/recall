-- Rename the CardLevel table to CardLevelTime, keeping every row.
-- The new table is created first, the rows are copied, and only then is the old table dropped.

-- CreateTable
CREATE TABLE "CardLevelTime" (
    "cardId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "crossesAt" DATETIME NOT NULL,
    PRIMARY KEY ("cardId", "level"),
    CONSTRAINT "CardLevelTime_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CopyRows
INSERT INTO "CardLevelTime" ("cardId", "level", "crossesAt")
SELECT "cardId", "level", "crossesAt" FROM "CardLevel";

-- DropTable (also drops its two indexes)
DROP TABLE "CardLevel";

-- CreateIndex
CREATE INDEX "CardLevelTime_level_crossesAt_idx" ON "CardLevelTime"("level", "crossesAt");
