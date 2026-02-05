const { generateContent } = require('../utils/gemini');

/**
 * Simple test script to verify Gemini API connection.
 * Note: Requires valid GEMINI_API_KEY in .env
 */
async function runTest() {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('Skipping Gemini test: GEMINI_API_KEY is missing in .env');
    return;
  }

  console.log('Testing Gemini (Standard)...');
  try {
    const response = await generateContent('Say hello');
    console.log('Gemini Response:', response);
  } catch (error) {
    console.error('Gemini Test Failed:', error.message);
  }
}

runTest();
