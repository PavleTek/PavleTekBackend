-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarColorConfig" (
    "id" SERIAL NOT NULL,
    "colorStartDate" TIMESTAMP(3) NOT NULL,
    "colorOne" TEXT NOT NULL DEFAULT '#ef4444',
    "colorTwo" TEXT NOT NULL DEFAULT '#22c55e',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarColorConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
