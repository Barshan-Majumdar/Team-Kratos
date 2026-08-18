const geminiClient = require('./geminiClient');

const DIMS = parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS) || 768;

async function generateEmbedding(text) {
  const result = await geminiClient.getAI().models.embedContent({
    model: process.env.GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: DIMS },  // pinned to 768 — matches vector(768) column
  });
  return result.embeddings[0].values; // float[768]
}

async function generateEmbeddingsBatch(texts) {
  const results = [];
  for (let i = 0; i < texts.length; i += 20) {
    const batch = texts.slice(i, i + 20);
    const embedded = await Promise.all(batch.map(generateEmbedding));
    results.push(...embedded);
  }
  return results;
}

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

module.exports = { generateEmbedding, generateEmbeddingsBatch, estimateTokens };
