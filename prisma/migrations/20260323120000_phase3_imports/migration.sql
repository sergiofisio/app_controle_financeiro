-- Phase 3 — importação de extratos

-- CreateEnum
CREATE TYPE "ImportFormat" AS ENUM ('CSV', 'OFX', 'PDF');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PREVIEW', 'CONFIRMED', 'REVERTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('PENDING', 'READY', 'DUPLICATE', 'SKIPPED', 'IMPORTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ClassificationState" AS ENUM ('AUTO', 'SUGGESTED', 'CONFIRMED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "financial_account"
ADD COLUMN "statedBalance" DECIMAL(18,2),
ADD COLUMN "statedBalanceAt" TIMESTAMP(3),
ADD COLUMN "lastReconciledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transaction"
ADD COLUMN "importBatchId" TEXT;

-- CreateTable
CREATE TABLE "import_mapping" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "delimiter" TEXT NOT NULL DEFAULT ';',
    "encoding" TEXT NOT NULL DEFAULT 'utf-8',
    "hasHeader" BOOLEAN NOT NULL DEFAULT true,
    "columnMap" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batch" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "format" "ImportFormat" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PREVIEW',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "mappingId" TEXT,
    "warningMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "revertedAt" TIMESTAMP(3),

    CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_row" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "rawJson" JSONB NOT NULL,
    "movementDate" DATE,
    "description" TEXT,
    "amount" DECIMAL(18,2),
    "signedAmount" DECIMAL(18,2),
    "bankTxnId" TEXT,
    "balanceAfter" DECIMAL(18,2),
    "suggestedType" "TxType",
    "suggestedCategoryId" TEXT,
    "classificationState" "ClassificationState" NOT NULL DEFAULT 'UNKNOWN',
    "fingerprint" TEXT,
    "duplicateOfTxId" TEXT,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "userType" "TxType",
    "userCategoryId" TEXT,
    "userDescription" TEXT,
    "include" BOOLEAN NOT NULL DEFAULT true,
    "reviewNote" TEXT,

    CONSTRAINT "import_row_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorization_rule" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "txType" "TxType",
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorization_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_mapping_householdId_idx" ON "import_mapping"("householdId");

-- CreateIndex
CREATE INDEX "import_batch_householdId_createdAt_idx" ON "import_batch"("householdId", "createdAt");

-- CreateIndex
CREATE INDEX "import_batch_accountId_fileHash_idx" ON "import_batch"("accountId", "fileHash");

-- CreateIndex
CREATE INDEX "import_batch_status_idx" ON "import_batch"("status");

-- CreateIndex
CREATE INDEX "import_row_batchId_status_idx" ON "import_row"("batchId", "status");

-- CreateIndex
CREATE INDEX "import_row_fingerprint_idx" ON "import_row"("fingerprint");

-- CreateIndex
CREATE INDEX "import_row_bankTxnId_idx" ON "import_row"("bankTxnId");

-- CreateIndex
CREATE INDEX "categorization_rule_householdId_isActive_priority_idx" ON "categorization_rule"("householdId", "isActive", "priority");

-- CreateIndex
CREATE INDEX "transaction_bankTxnId_idx" ON "transaction"("bankTxnId");

-- CreateIndex
CREATE INDEX "transaction_importBatchId_idx" ON "transaction"("importBatchId");

-- AddForeignKey
ALTER TABLE "import_mapping" ADD CONSTRAINT "import_mapping_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_mapping" ADD CONSTRAINT "import_mapping_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "import_mapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_row" ADD CONSTRAINT "import_row_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "import_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_rule" ADD CONSTRAINT "categorization_rule_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_rule" ADD CONSTRAINT "categorization_rule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
