/*
  Warnings:

  - Added the required column `title` to the `HRDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `HRDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `HRDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HRDocument" ADD COLUMN     "accessLevel" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "category" TEXT,
ADD COLUMN     "chunkIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "effectiveFrom" TIMESTAMP(3),
ADD COLUMN     "embeddedAt" TIMESTAMP(3),
ADD COLUMN     "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-004',
ADD COLUMN     "embeddingVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "pageNumber" INTEGER,
ADD COLUMN     "section" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "tokenCount" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uploadedById" TEXT;

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "toolResults" JSONB,
    "tokenCount" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatSession_tenantId_userId_updatedAt_idx" ON "ChatSession"("tenantId", "userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "HRDocument_tenantId_type_idx" ON "HRDocument"("tenantId", "type");

-- CreateIndex
CREATE INDEX "HRDocument_tenantId_status_embeddingVersion_idx" ON "HRDocument"("tenantId", "status", "embeddingVersion");

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
