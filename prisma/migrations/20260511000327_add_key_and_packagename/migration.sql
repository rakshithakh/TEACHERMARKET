/*
  Warnings:

  - A unique constraint covering the columns `[key]` on the table `CoinPackage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CoinPackage" ADD COLUMN     "key" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "packageName" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "CoinPackage_key_key" ON "CoinPackage"("key");
