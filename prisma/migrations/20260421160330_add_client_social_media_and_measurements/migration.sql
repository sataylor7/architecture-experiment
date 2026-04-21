/*
  Warnings:

  - You are about to drop the column `measurements` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `socialMedia` on the `Client` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('Inches', 'Centimeters');

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "measurements",
DROP COLUMN "socialMedia";

-- CreateTable
CREATE TABLE "ClientSocialMedia" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "facebook" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "linkedin" TEXT,
    "github" TEXT,

    CONSTRAINT "ClientSocialMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMeasurements" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "unit" "MeasurementUnit" NOT NULL DEFAULT 'Inches',
    "neck" DECIMAL(6,2),
    "shoulder" DECIMAL(6,2),
    "shoulderToElbow" DECIMAL(6,2),
    "bicep" DECIMAL(6,2),
    "wrist" DECIMAL(6,2),
    "chest" DECIMAL(6,2),
    "waist" DECIMAL(6,2),
    "hip" DECIMAL(6,2),
    "thigh" DECIMAL(6,2),
    "ankle" DECIMAL(6,2),
    "hipToKnee" DECIMAL(6,2),
    "crotchLength" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientMeasurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientSocialMedia_clientId_key" ON "ClientSocialMedia"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMeasurements_clientId_key" ON "ClientMeasurements"("clientId");

-- AddForeignKey
ALTER TABLE "ClientSocialMedia" ADD CONSTRAINT "ClientSocialMedia_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMeasurements" ADD CONSTRAINT "ClientMeasurements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
