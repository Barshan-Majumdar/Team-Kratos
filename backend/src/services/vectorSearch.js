const prisma = require('../config/db');
const { generateEmbedding } = require('./embeddings');

async function searchHRDocuments(query, tenantId, topK = null, requesterLevel = 1) {
  const k = topK || parseInt(process.env.AI_MAX_RETRIEVAL_RESULTS) || 8;
  const threshold = parseFloat(process.env.AI_SIMILARITY_THRESHOLD) || 0.65;
  const queryVector = await generateEmbedding(query);
  const now = new Date();

  // basePrisma + explicit tenantId — extension auto-inject does NOT work on raw SQL
  // Full metadata filter: tenant + accessLevel + status + effectiveFrom + expiresAt
  // This prevents retrieval of expired, future-dated, or restricted policy versions.
  const results = await prisma.basePrisma.$queryRaw`
    SELECT id, title, content, type, category, section, "pageNumber",
           1 - (embedding <=> ${JSON.stringify(queryVector)}::vector) AS similarity
    FROM "HRDocument"
    WHERE "tenantId" = ${tenantId}
      AND status = 'active'
      AND embedding IS NOT NULL
      AND (
        "accessLevel" = 'all'
        OR ("accessLevel" = 'level0' AND ${requesterLevel} = 0)
        OR ("accessLevel" = 'level1' AND ${requesterLevel} <= 1)
      )
      AND ("effectiveFrom" IS NULL OR "effectiveFrom" <= ${now})
      AND ("expiresAt" IS NULL OR "expiresAt" > ${now})
    ORDER BY embedding <=> ${JSON.stringify(queryVector)}::vector
    LIMIT ${k}
  `;
  return results.filter(r => parseFloat(r.similarity) > threshold);
}

// Trust boundary — document content is reference material, never instructions
function buildRetrievedContext(chunks) {
  return chunks.map(c =>
    `<retrieved_document source="${c.title}" type="${c.type}" relevance="${parseFloat(c.similarity).toFixed(2)}">\n${c.content}\n</retrieved_document>`
  ).join('\n\n');
}

module.exports = { searchHRDocuments, buildRetrievedContext };
