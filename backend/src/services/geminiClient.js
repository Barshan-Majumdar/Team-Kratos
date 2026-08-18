const { GoogleGenAI } = require('@google/genai');

class GeminiClient {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY missing — refusing to start.');
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  getAI() { return this.ai; }
}

module.exports = new GeminiClient(); // singleton — one instance for the process lifetime
// Triggered restart to load gemini-3.5-flash-lite

