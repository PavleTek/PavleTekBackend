-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "platformUploadAt" TIMESTAMP(3),
ADD COLUMN     "platformUploadError" TEXT,
ADD COLUMN     "platformUploadStatus" TEXT;
