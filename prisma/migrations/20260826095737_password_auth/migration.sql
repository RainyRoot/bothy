-- DropForeignKey
ALTER TABLE "Passkey" DROP CONSTRAINT "Passkey_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- DropTable
DROP TABLE "Passkey";

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
