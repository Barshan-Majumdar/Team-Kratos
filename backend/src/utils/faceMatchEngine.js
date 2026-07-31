function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    const valA = Number(a[i]) || 0;
    const valB = Number(b[i]) || 0;
    dot += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }
  const normA = Math.sqrt(magA);
  const normB = Math.sqrt(magB);
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

const MATCH_THRESHOLD = 0.85;

function matchFace(liveEmbedding, registeredEmbeddings) {
  if (!Array.isArray(registeredEmbeddings) || registeredEmbeddings.length === 0) {
    return { isMatch: false, similarity: 0 };
  }

  let bestSimilarity = -1;
  for (const registered of registeredEmbeddings) {
    const sim = cosineSimilarity(liveEmbedding, registered);
    if (sim > bestSimilarity) bestSimilarity = sim;
  }

  const finalSimilarity = Math.max(0, Math.min(1, parseFloat(bestSimilarity.toFixed(4))));
  return { 
    isMatch: finalSimilarity >= MATCH_THRESHOLD, 
    similarity: finalSimilarity 
  };
}

module.exports = { cosineSimilarity, matchFace, MATCH_THRESHOLD };
