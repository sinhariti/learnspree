const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates content using Google Gemini models.
 * @param {string} prompt - The prompt to send to the AI.
 * @param {boolean} useThinking - Whether to use the experimental thinking model.
 * @returns {Promise<string>} - The text response from the AI.
 */
async function generateContent(prompt, useThinking = false) {
  try {
    const modelName = useThinking
      ? "gemini-2.5-flash"
      : "gemini-2.5-flash-lite";

    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error(`Error generating content with Gemini (${useThinking ? 'thinking' : 'standard'}):`, error);
    throw error;
  }
}

module.exports = { generateContent };
