-- CreateTable
CREATE TABLE "QuoteInquiry" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "fullName" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "timezone" TEXT,
    "contactMethod" TEXT NOT NULL,
    "contactTime" TEXT,
    "projectType" TEXT NOT NULL,
    "projectCategory" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goals" TEXT NOT NULL,
    "users" TEXT,
    "metrics" TEXT,
    "keyFeatures" JSONB NOT NULL,
    "technologyIds" JSONB NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "urgency" TEXT NOT NULL,
    "deadlineHard" BOOLEAN NOT NULL DEFAULT false,
    "budgetRange" TEXT NOT NULL,
    "fundingSource" TEXT,
    "engineerCount" INTEGER,
    "seniorityJunior" INTEGER NOT NULL DEFAULT 0,
    "seniorityMid" INTEGER NOT NULL DEFAULT 0,
    "senioritySenior" INTEGER NOT NULL DEFAULT 0,
    "seniorityLead" INTEGER NOT NULL DEFAULT 0,
    "requiredSkills" TEXT,
    "repoUrl" TEXT,
    "currentStack" TEXT,
    "painPoints" TEXT,
    "ndaRequested" BOOLEAN NOT NULL DEFAULT false,
    "referral" TEXT,
    "notes" TEXT,
    "adminNotes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteAttachment" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "r2Key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "adminNotes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteInquiry_createdAt_idx" ON "QuoteInquiry"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteInquiry_status_idx" ON "QuoteInquiry"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteAttachment_r2Key_key" ON "QuoteAttachment"("r2Key");

-- CreateIndex
CREATE INDEX "QuoteAttachment_inquiryId_idx" ON "QuoteAttachment"("inquiryId");

-- CreateIndex
CREATE INDEX "MeetingRequest_createdAt_idx" ON "MeetingRequest"("createdAt");

-- CreateIndex
CREATE INDEX "MeetingRequest_status_idx" ON "MeetingRequest"("status");

-- AddForeignKey
ALTER TABLE "QuoteAttachment" ADD CONSTRAINT "QuoteAttachment_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "QuoteInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
