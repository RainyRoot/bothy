-- CreateEnum
CREATE TYPE "TodoPrioritaet" AS ENUM ('NIEDRIG', 'NORMAL', 'HOCH');

-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "prioritaet" "TodoPrioritaet" NOT NULL DEFAULT 'NORMAL',
    "erledigt" BOOLEAN NOT NULL DEFAULT false,
    "faelligkeit" DATE,
    "betrifft" "Betrifft" NOT NULL DEFAULT 'BEIDE',
    "sortierung" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoErinnerung" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "minutenVorher" INTEGER NOT NULL,

    CONSTRAINT "TodoErinnerung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoReminderJob" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "versuche" INTEGER NOT NULL DEFAULT 0,
    "fehler" TEXT,

    CONSTRAINT "TodoReminderJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Todo_faelligkeit_idx" ON "Todo"("faelligkeit");

-- CreateIndex
CREATE INDEX "TodoReminderJob_dueAt_sentAt_idx" ON "TodoReminderJob"("dueAt", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "TodoReminderJob_todoId_userId_dueAt_key" ON "TodoReminderJob"("todoId", "userId", "dueAt");

-- AddForeignKey
ALTER TABLE "TodoErinnerung" ADD CONSTRAINT "TodoErinnerung_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoReminderJob" ADD CONSTRAINT "TodoReminderJob_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoReminderJob" ADD CONSTRAINT "TodoReminderJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
