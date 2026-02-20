-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoicePdfR2Key" TEXT,
ADD COLUMN     "asPdfR2Key" TEXT,
ADD COLUMN     "documentsGeneratedAt" TIMESTAMP(3);
