/*
  Warnings:

  - You are about to drop the `TimesheetScreenshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TimesheetScreenshot" DROP CONSTRAINT "TimesheetScreenshot_invoiceId_fkey";

-- AlterTable
ALTER TABLE "Configuration" ADD COLUMN     "inquiriesNotificationEmail" TEXT,
ADD COLUMN     "notificationEmailSenderId" INTEGER;

-- DropTable
DROP TABLE "TimesheetScreenshot";
