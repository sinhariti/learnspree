const mongoose = require('mongoose');
const { generateContent } = require('../utils/gemini');
require('dotenv').config();

async function testConnections() {
  console.log('--- Connection Testing ---');

  // 1. Test MongoDB
  console.log('\n[1] Testing MongoDB Connection...');
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is missing in .env');
  } else {
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB Connected Successfully!');
      await mongoose.disconnect();
    } catch (error) {
      console.error('❌ MongoDB Connection Failed:', error.message);
    }
  }

  // 2. Test Gemini
  console.log('\n[2] Testing Gemini API...');
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('❌ GEMINI_API_KEY is missing in .env');
  } else {
    try {
      console.log('Trying Gemini 2.5 Flash (gemini-2.5-flash)...');
      const thinkingResponse = await generateContent('Say: "Flash verified!"', true);
      console.log('✅ Gemini 2.5 Flash:', thinkingResponse);
    } catch (error) {
      console.error('❌ Gemini 2.5 Flash Failed:', error.message);
    }

    try {
      console.log('\nTrying Gemini 2.5 Flash Lite (gemini-2.5-flash-lite)...');
      const standardResponse = await generateContent('Say: "Flash Lite verified!"', false);
      console.log('✅ Gemini 2.5 Flash Lite:', standardResponse);
    } catch (error) {
      console.error('❌ Gemini 2.5 Flash Lite Failed:', error.message);
    }
  }

  console.log('\n--- Testing Complete ---');
  process.exit(0);
}

testConnections();
