-- Migration: ESE 600-Day Mastery System
-- Adds ESE fields to Task, and creates EsePlan, EsePlanDay, EseTaskEvidence, EseResource, and EseSyllabusProgress tables.
-- Safe, additive migration preserving existing tables and data.

-- 1. Alter Task table to support ESE study tasks and completion evidence
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "eseNodeId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "esePlanId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "eseDayNumber" INTEGER;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "eseTaskType" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "evidenceAttested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "evidenceAttestedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "evidenceAttestation" TEXT;

-- 2. Create EsePlan table
CREATE TABLE IF NOT EXISTS "EsePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsePlan_pkey" PRIMARY KEY ("id")
);

-- 3. Create EsePlanDay table
CREATE TABLE IF NOT EXISTS "EsePlanDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "phase" TEXT NOT NULL,
    "focusSummary" TEXT NOT NULL,
    "totalEstimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EsePlanDay_pkey" PRIMARY KEY ("id")
);

-- 4. Create EseTaskEvidence table
CREATE TABLE IF NOT EXISTS "EseTaskEvidence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "driveUrl" TEXT NOT NULL,
    "attestationText" TEXT NOT NULL,
    "attestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL,

    CONSTRAINT "EseTaskEvidence_pkey" PRIMARY KEY ("id")
);

-- 5. Create EseResource table
CREATE TABLE IF NOT EXISTS "EseResource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "taskId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'GOOGLE_DRIVE',
    "subjectName" TEXT,
    "chapterTitle" TEXT,
    "topicTitle" TEXT,
    "subtopicTitle" TEXT,
    "nodeId" TEXT,
    "isClassified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EseResource_pkey" PRIMARY KEY ("id")
);

-- 6. Create EseSyllabusProgress table
CREATE TABLE IF NOT EXISTS "EseSyllabusProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "evidenceUrl" TEXT,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "lastStudiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EseSyllabusProgress_pkey" PRIMARY KEY ("id")
);

-- Indexes and Constraints
CREATE INDEX IF NOT EXISTS "EsePlan_userId_status_idx" ON "EsePlan"("userId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "EsePlanDay_planId_dayNumber_key" ON "EsePlanDay"("planId", "dayNumber");
CREATE INDEX IF NOT EXISTS "EsePlanDay_planId_date_idx" ON "EsePlanDay"("planId", "date");

CREATE INDEX IF NOT EXISTS "EseTaskEvidence_userId_taskId_idx" ON "EseTaskEvidence"("userId", "taskId");
CREATE INDEX IF NOT EXISTS "EseTaskEvidence_userId_nodeId_idx" ON "EseTaskEvidence"("userId", "nodeId");

CREATE UNIQUE INDEX IF NOT EXISTS "EseResource_userId_url_key" ON "EseResource"("userId", "url");
CREATE INDEX IF NOT EXISTS "EseResource_userId_isClassified_idx" ON "EseResource"("userId", "isClassified");
CREATE INDEX IF NOT EXISTS "EseResource_userId_nodeId_idx" ON "EseResource"("userId", "nodeId");

CREATE UNIQUE INDEX IF NOT EXISTS "EseSyllabusProgress_userId_nodeId_key" ON "EseSyllabusProgress"("userId", "nodeId");
CREATE INDEX IF NOT EXISTS "EseSyllabusProgress_userId_status_idx" ON "EseSyllabusProgress"("userId", "status");

-- Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EsePlan_userId_fkey') THEN
        ALTER TABLE "EsePlan" ADD CONSTRAINT "EsePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EsePlanDay_planId_fkey') THEN
        ALTER TABLE "EsePlanDay" ADD CONSTRAINT "EsePlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "EsePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EseTaskEvidence_userId_fkey') THEN
        ALTER TABLE "EseTaskEvidence" ADD CONSTRAINT "EseTaskEvidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EseTaskEvidence_taskId_fkey') THEN
        ALTER TABLE "EseTaskEvidence" ADD CONSTRAINT "EseTaskEvidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EseResource_userId_fkey') THEN
        ALTER TABLE "EseResource" ADD CONSTRAINT "EseResource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EseResource_planId_fkey') THEN
        ALTER TABLE "EseResource" ADD CONSTRAINT "EseResource_planId_fkey" FOREIGN KEY ("planId") REFERENCES "EsePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EseSyllabusProgress_userId_fkey') THEN
        ALTER TABLE "EseSyllabusProgress" ADD CONSTRAINT "EseSyllabusProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
