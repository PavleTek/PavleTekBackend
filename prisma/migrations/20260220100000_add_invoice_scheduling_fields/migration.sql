-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "scheduledSendAt" TIMESTAMP(3),
ADD COLUMN     "scheduledStatus" TEXT,
ADD COLUMN     "scheduledEmailData" JSONB,
ADD COLUMN     "scheduledSentAt" TIMESTAMP(3),
ADD COLUMN     "scheduledError" TEXT;
