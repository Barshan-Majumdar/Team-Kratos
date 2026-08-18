const geminiClient = require('./geminiClient');

const JD_SCHEMA = {
  type: "object",
  properties: {
    requiredSkills: { type: "array", items: { type: "string" } },
    preferredSkills: { type: "array", items: { type: "string" } },
    minimumExperienceYears: { type: "number" },
    educationRequirements: { type: "array", items: { type: "string" } },
    responsibilities: { type: "array", items: { type: "string" } }
  },
  required: ["requiredSkills", "preferredSkills", "minimumExperienceYears", "educationRequirements", "responsibilities"]
};

async function parseJobDescription(title, description, requirements) {
  const prompt = `You are an expert HR ATS parser. Extract the structured requirements from the following Job Requisition.

Title: ${title}
Description: ${description || 'Not provided'}
Requirements: ${requirements || 'Not provided'}

Follow this exact JSON structure:
{
  "requiredSkills": ["Java", "Spring Boot", ...],
  "preferredSkills": ["AWS", ...],
  "minimumExperienceYears": 3.5, // Extract minimum years. If not explicitly stated, infer 0.
  "educationRequirements": ["B.Tech", ...],
  "responsibilities": ["Develop REST APIs", ...]
}
}
IMPORTANT RULES:
1. Return ONLY valid JSON matching the schema.
2. Do not invent requirements that are not stated. Ensure formatting is exact.
3. Protected characteristics (e.g., race, religion, gender, age, nationality, marital status) MUST BE EXCLUDED from the requirements. Never use them as valid ATS signals.`;

  try {
    const result = await geminiClient.getAI().models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: JD_SCHEMA,
      }
    });

    return JSON.parse(result.text);
  } catch (error) {
    console.error('JD Parsing Error:', error);
    throw new Error('Failed to parse Job Description');
  }
}

module.exports = {
  parseJobDescription
};
