-- Add ASDocument column to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "ASDocument" JSONB;

-- Migrate existing AS template data to Invoice.ASDocument
UPDATE "Invoice" 
SET "ASDocument" = (
  SELECT items FROM "ASTemplate" 
  WHERE "ASTemplate"."invoiceTemplateId" = "Invoice"."id"
)
WHERE EXISTS (
  SELECT 1 FROM "ASTemplate" 
  WHERE "ASTemplate"."invoiceTemplateId" = "Invoice"."id"
);

-- Drop foreign key constraint
ALTER TABLE "ASTemplate" DROP CONSTRAINT IF EXISTS "ASTemplate_invoiceTemplateId_fkey";

-- Drop ASTemplate table
DROP TABLE IF EXISTS "ASTemplate";

