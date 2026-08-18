const geminiClient = require('./geminiClient');

const RESUME_SCHEMA = {
  type: "object",
  properties: {
    skills: { type: "array", items: { type: "string" } },
    experienceYears: { type: "number" },
    education: { 
      type: "array", 
      items: {
        type: "object",
        properties: {
          degree: { type: "string" },
          field: { type: "string" }
        }
      }
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          durationMonths: { type: "number" },
          responsibilities: { type: "array", items: { type: "string" } }
        }
      }
    },
    projects: { type: "array", items: { type: "string" } },
    certifications: { type: "array", items: { type: "string" } }
  },
  required: ["skills", "experienceYears", "education", "experience", "projects", "certifications"]
};

async function parseResumeText(resumeText) {
  const prompt = `You are an expert HR ATS Resume parser. Extract the structured candidate profile from the following resume text.

Resume Text:
${resumeText}

IMPORTANT RULES:
1. Extract ALL listed skills.
2. Calculate the TOTAL years of relevant professional experience and output it as a number (e.g., 3.5).
3. Extract education, experience details, projects, and certifications.
4. Protected characteristics (e.g., race, religion, gender, age, nationality, marital status) MUST BE IGNORED completely. Do NOT extract them or let them influence the parsing.

Output strictly as JSON matching the schema.`;

  try {
    const result = await geminiClient.getAI().models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESUME_SCHEMA,
      }
    });

    return JSON.parse(result.text);
  } catch (error) {
    console.error('Resume Parsing Error:', error);
    throw new Error('Failed to parse Resume');
  }
}

module.exports = {
  parseResumeText
};
