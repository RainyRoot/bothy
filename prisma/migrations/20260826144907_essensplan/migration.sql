-- CreateTable
CREATE TABLE "Mahlzeit" (
    "id" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "titel" TEXT NOT NULL,
    "zutaten" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mahlzeit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Einkaufsliste" (
    "id" TEXT NOT NULL,
    "woche" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Einkaufsliste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EinkaufslistenItem" (
    "id" TEXT NOT NULL,
    "einkaufslisteId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "abgehakt" BOOLEAN NOT NULL DEFAULT false,
    "sortierung" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EinkaufslistenItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mahlzeit_datum_idx" ON "Mahlzeit"("datum");

-- CreateIndex
CREATE UNIQUE INDEX "Einkaufsliste_woche_key" ON "Einkaufsliste"("woche");

-- AddForeignKey
ALTER TABLE "EinkaufslistenItem" ADD CONSTRAINT "EinkaufslistenItem_einkaufslisteId_fkey" FOREIGN KEY ("einkaufslisteId") REFERENCES "Einkaufsliste"("id") ON DELETE CASCADE ON UPDATE CASCADE;
