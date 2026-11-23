-- Phase 2 finance schema
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'PAYMENT', 'CASH', 'INVESTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "HolderKind" AS ENUM ('MEMBER', 'HOUSEHOLD');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT', 'CONTRIBUTION', 'WITHDRAWAL', 'YIELD');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'CLEARED', 'SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TxOrigin" AS ENUM ('MANUAL', 'IMPORT', 'SYSTEM', 'CARD', 'TRANSFER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'CLOSED', 'PAID', 'PARTIAL');

-- CreateTable
CREATE TABLE "financial_account" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "type" "AccountType" NOT NULL DEFAULT 'CHECKING',
    "holderKind" "HolderKind" NOT NULL DEFAULT 'HOUSEHOLD',
    "holderUserId" TEXT,
    "initialBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "initialBalanceDate" DATE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "financial_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" "CategoryKind" NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_group" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "movementDate" DATE NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_transaction" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "accountId" TEXT,
    "creditCardId" TEXT,
    "holderKind" "HolderKind" NOT NULL DEFAULT 'HOUSEHOLD',
    "holderUserId" TEXT,
    "dayOfMonth" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_card" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "holderUserId" TEXT,
    "creditLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "credit_card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_card_invoice" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "referenceMonth" DATE NOT NULL,
    "closingDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "paidAt" TIMESTAMP(3),
    "paymentTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_card_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "accountId" TEXT,
    "creditCardId" TEXT,
    "invoiceId" TEXT,
    "holderKind" "HolderKind" NOT NULL DEFAULT 'HOUSEHOLD',
    "holderUserId" TEXT,
    "movementDate" DATE NOT NULL,
    "competenceDate" DATE,
    "dueDate" DATE,
    "status" "TxStatus" NOT NULL DEFAULT 'CLEARED',
    "origin" "TxOrigin" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "transferGroupId" TEXT,
    "installmentGroupId" TEXT,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "recurringId" TEXT,
    "fingerprint" TEXT,
    "bankTxnId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);













-- CreateIndex
CREATE INDEX "financial_account_householdId_isActive_idx" ON "financial_account"("householdId", "isActive");

-- CreateIndex
CREATE INDEX "financial_account_holderUserId_idx" ON "financial_account"("holderUserId");

-- CreateIndex
CREATE INDEX "category_householdId_kind_idx" ON "category"("householdId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "category_householdId_kind_name_parentId_key" ON "category"("householdId", "kind", "name", "parentId");

-- CreateIndex
CREATE INDEX "transfer_group_householdId_idx" ON "transfer_group"("householdId");

-- CreateIndex
CREATE INDEX "recurring_transaction_householdId_isActive_idx" ON "recurring_transaction"("householdId", "isActive");

-- CreateIndex
CREATE INDEX "credit_card_householdId_isActive_idx" ON "credit_card"("householdId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "credit_card_invoice_paymentTransactionId_key" ON "credit_card_invoice"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "credit_card_invoice_householdId_status_idx" ON "credit_card_invoice"("householdId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "credit_card_invoice_creditCardId_referenceMonth_key" ON "credit_card_invoice"("creditCardId", "referenceMonth");

-- CreateIndex
CREATE INDEX "transaction_householdId_movementDate_idx" ON "transaction"("householdId", "movementDate");

-- CreateIndex
CREATE INDEX "transaction_householdId_type_status_idx" ON "transaction"("householdId", "type", "status");

-- CreateIndex
CREATE INDEX "transaction_accountId_movementDate_idx" ON "transaction"("accountId", "movementDate");

-- CreateIndex
CREATE INDEX "transaction_creditCardId_idx" ON "transaction"("creditCardId");

-- CreateIndex
CREATE INDEX "transaction_invoiceId_idx" ON "transaction"("invoiceId");

-- CreateIndex
CREATE INDEX "transaction_transferGroupId_idx" ON "transaction"("transferGroupId");

-- CreateIndex
CREATE INDEX "transaction_installmentGroupId_idx" ON "transaction"("installmentGroupId");

-- CreateIndex
CREATE INDEX "transaction_fingerprint_idx" ON "transaction"("fingerprint");

-- CreateIndex
CREATE INDEX "transaction_deletedAt_idx" ON "transaction"("deletedAt");








-- AddForeignKey
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_holderUserId_fkey" FOREIGN KEY ("holderUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_group" ADD CONSTRAINT "transfer_group_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_group" ADD CONSTRAINT "transfer_group_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "financial_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_group" ADD CONSTRAINT "transfer_group_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "financial_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transaction" ADD CONSTRAINT "recurring_transaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card" ADD CONSTRAINT "credit_card_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card" ADD CONSTRAINT "credit_card_holderUserId_fkey" FOREIGN KEY ("holderUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_invoice" ADD CONSTRAINT "credit_card_invoice_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_invoice" ADD CONSTRAINT "credit_card_invoice_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "credit_card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_invoice" ADD CONSTRAINT "credit_card_invoice_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "credit_card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "credit_card_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_transferGroupId_fkey" FOREIGN KEY ("transferGroupId") REFERENCES "transfer_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurring_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_holderUserId_fkey" FOREIGN KEY ("holderUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

