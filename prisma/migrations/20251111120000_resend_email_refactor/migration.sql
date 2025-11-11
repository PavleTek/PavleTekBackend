/*
  Warnings:

  - You are about to drop the column `aliases` on the `EmailSender` table. All the data in the column will be lost.
  - You are about to drop the column `emailProvider` on the `EmailSender` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `EmailSender` table. All the data in the column will be lost.

*/
-- Drop columns that are no longer needed for Resend-based email sending
ALTER TABLE "EmailSender"
  DROP COLUMN "aliases",
  DROP COLUMN "emailProvider",
  DROP COLUMN "refreshToken";

-- Remove the enum type that represented email providers (GMAIL/OUTLOOK)
DROP TYPE "EmailProvider";

