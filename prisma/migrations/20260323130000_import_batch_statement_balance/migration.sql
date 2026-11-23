-- AlterTable
ALTER TABLE "import_batch" ADD COLUMN "statementBalance" DECIMAL(18,2);
ALTER TABLE "import_batch" ADD COLUMN "statementBalanceAt" TIMESTAMP(3);
