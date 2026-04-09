const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  console.log('Using API Key (last 4):', apiKey.slice(-4));
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const axios = require('axios');
    const resp = await axios.get(url);
    console.log('Available models:');
    resp.data.models.forEach(m => console.log(' - ' + m.name));
  } catch (error) {
    console.error('Failed to list models:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
  }
}

listModels();
