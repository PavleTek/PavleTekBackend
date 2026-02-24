-- CreateTable
CREATE TABLE "StrideDocument" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mdR2Key" TEXT,
    "pdfR2Key" TEXT,
    "mdFileSize" INTEGER,
    "pdfFileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "StrideDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StrideDocument" ADD CONSTRAINT "StrideDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
