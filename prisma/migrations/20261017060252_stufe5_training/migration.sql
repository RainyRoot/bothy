-- CreateTable
CREATE TABLE "Uebung" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archiviert" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Uebung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trainingsplan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortierung" INTEGER NOT NULL DEFAULT 0,
    "archiviert" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Trainingsplan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanUebung" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "uebungId" TEXT NOT NULL,
    "sortierung" INTEGER NOT NULL,
    "zielSaetze" INTEGER NOT NULL DEFAULT 3,
    "zielWdh" INTEGER,

    CONSTRAINT "PlanUebung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "planId" TEXT,
    "gestartetAt" TIMESTAMP(3) NOT NULL,
    "beendetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Satz" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uebungId" TEXT NOT NULL,
    "gewichtGramm" INTEGER NOT NULL,
    "wiederholungen" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Satz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Uebung_name_key" ON "Uebung"("name");

-- CreateIndex
CREATE INDEX "PlanUebung_planId_sortierung_idx" ON "PlanUebung"("planId", "sortierung");

-- CreateIndex
CREATE INDEX "Training_datum_idx" ON "Training"("datum");

-- CreateIndex
CREATE INDEX "Satz_userId_uebungId_createdAt_idx" ON "Satz"("userId", "uebungId", "createdAt");

-- CreateIndex
CREATE INDEX "Satz_trainingId_idx" ON "Satz"("trainingId");

-- AddForeignKey
ALTER TABLE "PlanUebung" ADD CONSTRAINT "PlanUebung_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Trainingsplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanUebung" ADD CONSTRAINT "PlanUebung_uebungId_fkey" FOREIGN KEY ("uebungId") REFERENCES "Uebung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Trainingsplan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Satz" ADD CONSTRAINT "Satz_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Satz" ADD CONSTRAINT "Satz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Satz" ADD CONSTRAINT "Satz_uebungId_fkey" FOREIGN KEY ("uebungId") REFERENCES "Uebung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
