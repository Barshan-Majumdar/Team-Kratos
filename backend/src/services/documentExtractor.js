const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function extractText(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mimeType.includes('wordprocessingml')) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return buffer.toString('utf-8');
  }
  throw new Error(`Unsupported document type: ${mimeType}`);
}

// Semantic chunking — splits on double newlines (paragraphs), respects token budget
function chunkText(text, maxTokens = 400, overlapTokens = 50) {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    const combined = current + '\n\n' + para;
    if (combined.length / 4 > maxTokens && current.length > 0) {
      chunks.push(current.trim());
      const words = current.split(' ');
      const overlapWords = words.slice(-Math.floor(overlapTokens * 0.75));
      current = overlapWords.join(' ') + '\n\n' + para;
    } else {
      current = combined;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}

module.exports = { extractText, chunkText };
