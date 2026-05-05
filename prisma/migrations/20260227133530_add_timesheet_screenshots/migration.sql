-- CreateTable
CREATE TABLE "TimesheetScreenshot" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "executedBy" TEXT,
    "r2Key" TEXT NOT NULL,
    "contentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimesheetScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetScreenshot_invoiceId_itemIndex_key" ON "TimesheetScreenshot"("invoiceId", "itemIndex");

-- AddForeignKey
ALTER TABLE "TimesheetScreenshot" ADD CONSTRAINT "TimesheetScreenshot_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
