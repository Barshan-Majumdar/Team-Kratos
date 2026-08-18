-- Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "ATSStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'STALE');

-- CreateEnum
CREATE TYPE "ExplanationStatus" AS ENUM ('NOT_GENERATED', 'GENERATING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "atsStatus" "ATSStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "resumeVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "structuredData" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "JobRequisition" ADD COLUMN     "scoringConfig" JSONB,
ADD COLUMN     "structuredData" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ATSResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "breakdown" JSONB,
    "matchEvidence" JSONB,
    "missingSkills" JSONB,
    "explanation" TEXT,
    "explanationStatus" "ExplanationStatus" NOT NULL DEFAULT 'NOT_GENERATED',
    "engineVersion" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "jobVersion" INTEGER NOT NULL,
    "resumeVersion" INTEGER NOT NULL,
    "status" "ATSStatus" NOT NULL,
    "failureReason" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFingerprint" TEXT NOT NULL,

    CONSTRAINT "ATSResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ATSEmbedding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "jobId" TEXT,
    "applicationId" TEXT,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-004',
    "embeddingVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ATSEmbedding_pkey" PRIMARY KEY ("id")
);

-- Add vector column manually
ALTER TABLE "ATSEmbedding" ADD COLUMN "embedding" vector(768);

-- CreateIndex
CREATE INDEX "ATSResult_tenantId_applicationId_idx" ON "ATSResult"("tenantId", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ATSResult_tenantId_applicationId_dataFingerprint_key" ON "ATSResult"("tenantId", "applicationId", "dataFingerprint");

-- CreateIndex
CREATE INDEX "ATSEmbedding_tenantId_documentType_idx" ON "ATSEmbedding"("tenantId", "documentType");

-- CreateIndex
CREATE INDEX "ATSEmbedding_sourceId_idx" ON "ATSEmbedding"("sourceId");

-- CreateIndex
CREATE INDEX "ATSEmbedding_applicationId_idx" ON "ATSEmbedding"("applicationId");

-- CreateIndex for Vector Search
CREATE INDEX "ats_embedding_idx" ON "ATSEmbedding" USING hnsw ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "ATSResult" ADD CONSTRAINT "ATSResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ATSResult" ADD CONSTRAINT "ATSResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ATSEmbedding" ADD CONSTRAINT "ATSEmbedding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
