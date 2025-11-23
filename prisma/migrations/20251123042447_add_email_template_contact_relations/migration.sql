-- CreateTable
CREATE TABLE "EmailTemplateContact" (
    "id" SERIAL NOT NULL,
    "emailTemplateId" INTEGER NOT NULL,
    "contactId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "EmailTemplateContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailTemplateContact_emailTemplateId_idx" ON "EmailTemplateContact"("emailTemplateId");

-- CreateIndex
CREATE INDEX "EmailTemplateContact_contactId_idx" ON "EmailTemplateContact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplateContact_emailTemplateId_contactId_type_key" ON "EmailTemplateContact"("emailTemplateId", "contactId", "type");

-- AddForeignKey
ALTER TABLE "EmailTemplateContact" ADD CONSTRAINT "EmailTemplateContact_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplateContact" ADD CONSTRAINT "EmailTemplateContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
