-- AlterTable
-- Conditionally drop column only if it exists (handles cases where migration was never applied)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'EmailTemplate' 
        AND column_name = 'replyToEmail'
    ) THEN
        ALTER TABLE "EmailTemplate" DROP COLUMN "replyToEmail";
    END IF;
END $$;

