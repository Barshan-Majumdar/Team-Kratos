const crypto = require('crypto');
const prisma = require('../config/db');
const { generateEmbeddingsBatch, estimateTokens } = require('./embeddings');
const { extractText, chunkText } = require('./documentExtractor');

async function ingestDocument({ tenantId, title, type, category, sourceId, buffer, mimeType, uploadedById, accessLevel, effectiveFrom, expiresAt }) {
  const fullText = await extractText(buffer, mimeType);
  const chunks = chunkText(fullText);
  const embeddings = await generateEmbeddingsBatch(chunks);

  for (let i = 0; i < chunks.length; i++) {
    const id = crypto.randomUUID();
    // MUST use $executeRaw — Prisma extension cannot handle vector() columns
    // tenantId explicitly in SQL — extension auto-inject does NOT apply to raw SQL
    await prisma.basePrisma.$executeRaw`
      INSERT INTO "HRDocument"
        (id, "tenantId", title, type, category, "sourceId", content, "chunkIndex",
         "embeddingModel", "embeddingVersion", "embeddedAt", "tokenCount",
         "accessLevel", status, "uploadedById", "createdAt", "updatedAt", embedding, "effectiveFrom", "expiresAt")
      VALUES
        (${id}, ${tenantId}, ${title}, ${type}, ${category || null}, ${sourceId || null},
         ${chunks[i]}, ${i}, ${process.env.GEMINI_EMBEDDING_MODEL}, 1, NOW(),
         ${estimateTokens(chunks[i])}, ${accessLevel || 'all'}, 'active', ${uploadedById || null}, NOW(), NOW(),
         ${JSON.stringify(embeddings[i])}::vector, ${effectiveFrom || null}, ${expiresAt || null})
    `;
  }
  return { chunksCreated: chunks.length, title };
}

async function reembedStaleDocuments(tenantId, currentVersion = 1) {
  const stale = await prisma.basePrisma.hRDocument.findMany({
    where: { tenantId, embeddingVersion: { lt: currentVersion } },
  });
  const { generateEmbedding } = require('./embeddings');
  for (const doc of stale) {
    const embedding = await generateEmbedding(doc.content);
    await prisma.basePrisma.$executeRaw`
      UPDATE "HRDocument"
      SET embedding = ${JSON.stringify(embedding)}::vector,
          "embeddingVersion" = ${currentVersion},
          "embeddedAt" = NOW()
      WHERE id = ${doc.id}
    `;
  }
  return { reembedded: stale.length };
}

module.exports = { ingestDocument, reembedStaleDocuments };
