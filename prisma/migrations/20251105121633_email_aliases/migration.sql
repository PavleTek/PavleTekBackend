-- AlterTable
ALTER TABLE "EmailSender" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
