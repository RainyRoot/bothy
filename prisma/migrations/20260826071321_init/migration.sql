-- CreateEnum
CREATE TYPE "TopfTyp" AS ENUM ('VERBRAUCH', 'SPARZIEL');

-- CreateEnum
CREATE TYPE "Rhythmus" AS ENUM ('KEINE', 'WOECHENTLICH', 'MONATLICH', 'JAEHRLICH');

-- CreateEnum
CREATE TYPE "Betrifft" AS ENUM ('PARTNER_A', 'PARTNER_B', 'BEIDE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOkAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topf" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typ" "TopfTyp" NOT NULL,
    "zielCent" INTEGER,
    "zielDatum" TIMESTAMP(3),
    "farbe" TEXT NOT NULL,
    "sortierung" INTEGER NOT NULL DEFAULT 0,
    "archiviert" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Topf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buchung" (
    "id" TEXT NOT NULL,
    "topfId" TEXT NOT NULL,
    "betragCent" INTEGER NOT NULL,
    "datum" DATE NOT NULL,
    "notiz" TEXT,
    "vonUserId" TEXT NOT NULL,
    "transferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Buchung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Termin" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "ganztags" BOOLEAN NOT NULL DEFAULT false,
    "start" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3),
    "ort" TEXT,
    "notiz" TEXT,
    "farbe" TEXT,
    "betrifft" "Betrifft" NOT NULL DEFAULT 'BEIDE',
    "rhythmus" "Rhythmus" NOT NULL DEFAULT 'KEINE',
    "serienEnde" TIMESTAMP(3),
    "archiviert" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Termin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminErinnerung" (
    "id" TEXT NOT NULL,
    "terminId" TEXT NOT NULL,
    "minutenVorher" INTEGER NOT NULL,

    CONSTRAINT "TerminErinnerung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminAusnahme" (
    "id" TEXT NOT NULL,
    "terminId" TEXT NOT NULL,
    "datum" DATE NOT NULL,

    CONSTRAINT "TerminAusnahme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderJob" (
    "id" TEXT NOT NULL,
    "terminId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "versuche" INTEGER NOT NULL DEFAULT 0,
    "fehler" TEXT,

    CONSTRAINT "ReminderJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "Buchung_topfId_datum_idx" ON "Buchung"("topfId", "datum");

-- CreateIndex
CREATE INDEX "Buchung_transferId_idx" ON "Buchung"("transferId");

-- CreateIndex
CREATE INDEX "Termin_start_idx" ON "Termin"("start");

-- CreateIndex
CREATE UNIQUE INDEX "TerminAusnahme_terminId_datum_key" ON "TerminAusnahme"("terminId", "datum");

-- CreateIndex
CREATE INDEX "ReminderJob_dueAt_sentAt_idx" ON "ReminderJob"("dueAt", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderJob_terminId_userId_dueAt_key" ON "ReminderJob"("terminId", "userId", "dueAt");

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buchung" ADD CONSTRAINT "Buchung_topfId_fkey" FOREIGN KEY ("topfId") REFERENCES "Topf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buchung" ADD CONSTRAINT "Buchung_vonUserId_fkey" FOREIGN KEY ("vonUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminErinnerung" ADD CONSTRAINT "TerminErinnerung_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminAusnahme" ADD CONSTRAINT "TerminAusnahme_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderJob" ADD CONSTRAINT "ReminderJob_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderJob" ADD CONSTRAINT "ReminderJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
