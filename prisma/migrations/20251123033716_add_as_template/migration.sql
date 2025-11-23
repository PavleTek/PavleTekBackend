-- CreateTable
CREATE TABLE "ASTemplate" (
    "id" SERIAL NOT NULL,
    "items" JSONB NOT NULL,
    "invoiceTemplateId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ASTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ASTemplate_invoiceTemplateId_key" ON "ASTemplate"("invoiceTemplateId");

-- AddForeignKey
ALTER TABLE "ASTemplate" ADD CONSTRAINT "ASTemplate_invoiceTemplateId_fkey" FOREIGN KEY ("invoiceTemplateId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
