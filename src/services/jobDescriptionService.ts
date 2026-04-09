import axios from 'axios';
import OpenAI from 'openai';
import { IAIResumeResponse } from '../types';

class JobDescriptionService {
  private _openai: OpenAI | null = null;

  private getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    if (!this._openai) this._openai = new OpenAI({ apiKey });
    return this._openai;
  }

  /**
   * Use Gemini to extract job details
   */
  /**
   * Use Gemini to extract job details
   */
  private async extractWithGemini(jdText: string): Promise<IAIResumeResponse & { provider?: string }> {
    const schema = `{ "company_name": string, "job_role": string, "remote_or_not": string, "money": string }`;
    const prompt = `You are a professional recruiting assistant. Extract the following details from the Job Description text below. 
Return ONLY a valid JSON object. No other text, no markdown code blocks.

FIELDS:
1. company_name (e.g. "Google")
2. job_role (e.g. "Frontend Developer")
3. remote_or_not (e.g. "Remote", "San Francisco, CA")
4. money (e.g. "$120,000 - $160,000" or "Negotiable")

JSON SCHEMA: ${schema}

JOB DESCRIPTION TEXT:
${jdText}`;
    
    try {
      const rawResponse = await this.callGeminiRaw(prompt);
      const data = this.cleanAndParseJSON(rawResponse);

      return {
        company: data.company_name || 'Not Found',
        role: data.job_role || 'Not Found',
        location: data.remote_or_not || 'Not Found',
        salaryRange: data.money || 'Not Specified',
        seniority: 'Not Specified',
        skills_required: [],
        skills_nice_to_have: [],
        provider: 'GEMINI'
      };
    } catch (error: any) {
      console.error('Gemini Extraction Error:', error.message);
      return {
        company: 'Extraction Failed',
        role: 'Check JD Text',
        location: 'N/A',
        salaryRange: 'N/A',
        seniority: 'N/A',
        skills_required: [],
        skills_nice_to_have: [],
        provider: 'GEMINI (Error)'
      };
    }
  }

  /**
   * Use OpenAI to extract job details
   */
  private async extractWithOpenAI(jdText: string): Promise<IAIResumeResponse & { provider?: string }> {
    const schema = `{ "company_name": string, "job_role": string, "remote_or_not": string, "money": string }`;
    const prompt = `Extract these 4 things from the Job Description below and return as JSON:\n1. company_name\n2. job_role\n3. remote_or_not\n4. money\n\nJSON SCHEMA: ${schema}\n\nJD TEXT:\n${jdText}`;

    try {
      const openai = this.getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Extract strictly to JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const rawResponse = response.choices[0]?.message?.content || '{}';
      const data = JSON.parse(rawResponse);

      return {
        company: data.company_name || 'Not Found',
        role: data.job_role || 'Not Found',
        location: data.remote_or_not || 'Not Found',
        salaryRange: data.money || 'Not Specified',
        seniority: 'Not Specified',
        skills_required: [],
        skills_nice_to_have: [],
        provider: 'OPENAI'
      };
    } catch (error) {
      return {
        company: 'Extraction Failed',
        role: 'Check JD Text',
        location: 'N/A',
        salaryRange: 'N/A',
        seniority: 'N/A',
        skills_required: [],
        skills_nice_to_have: [],
        provider: 'OPENAI (Error)'
      };
    }
  }

  /**
   * RAW GEMINI CALL with Robust Multi-Model Fallback
   */
  private async callGeminiRaw(prompt: string): Promise<string> {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const rawApiKey = process.env.GEMINI_API_KEY;
    if (!rawApiKey) throw new Error('GEMINI_API_KEY is not configured');
    
    const apiKey = rawApiKey.trim();
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Based on ListModels check, 1.5 is replaced by newer versions like 2.5 and 2.0
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-2.5-pro'
    ];

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini] Attempting extraction with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        if (text) return text;
      } catch (error: any) {
        console.warn(`[Gemini SDK Fallback] Model ${modelName} failed: ${error.message}`);
        lastError = error;
        
        // If we get a 404, we might be using the wrong endpoint or model name
        // The SDK usually handles this, but we keep trying other models
      }
    }

    // FINAL FALLBACK: Raw Axios call to V1 endpoint (non-beta)
    try {
      console.log(`[Gemini] Attempting final fallback with Raw Axios (V1 endpoint)`);
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      }, { timeout: 10000 });
      
      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e: any) {
      console.error(`[Gemini] Final Axios Fallback failed: ${e.message}`);
    }

    throw new Error(`Gemini failed all models (SDK & Axios). Last error: ${lastError?.message || 'Unknown'}`);
  }

  private cleanAndParseJSON(text: string): any {
    try {
      // Remove any markdown code block indicators
      let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Find the first { and last } to isolate the JSON object
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start === -1 || end === -1) return {};
      
      return JSON.parse(clean.substring(start, end + 1));
    } catch (e) {
      console.error('JSON Parse Error for text:', text);
      return {};
    }
  }

  /**
   * Main entry point to extract job details
   */
  async extractJobDetails(jdText: string): Promise<IAIResumeResponse & { provider?: string }> {
    if (process.env.USE_MOCK === 'true') {
      return { 
        company: "Mock Co.", 
        role: "Developer", 
        skills_required: [], 
        skills_nice_to_have: [], 
        seniority: "Mid", 
        location: "Remote",
        provider: 'MOCK'
      };
    }

    const provider = process.env.AI_PROVIDER?.toLowerCase() || 'gemini';

    if (provider === 'gemini') {
      return await this.extractWithGemini(jdText);
    } else {
      return await this.extractWithOpenAI(jdText);
    }
  }

  /**
   * Generate bullets (refactored to use provider-specific logic)
   */
  async generateResumeBullets(jdText: string, userExperience: string): Promise<string[]> {
    const prompt = `Generate 3 bullet points for a resume based on this JD:\n${jdText}\n\nExperience: ${userExperience}\nFormat: Return as a JSON array of strings in a key called "bullets".`;
    const provider = process.env.AI_PROVIDER?.toLowerCase() || 'gemini';
    
    let rawResponse = '';
    try {
      if (provider === 'gemini') {
         rawResponse = await this.callGeminiRaw(prompt);
      } else {
         const openai = this.getOpenAIClient();
         const response = await openai.chat.completions.create({
           model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
           messages: [{ role: 'user', content: prompt }],
           response_format: { type: 'json_object' }
         });
         rawResponse = response.choices[0]?.message?.content || '{}';
      }
    } catch (e) {
      console.error('AI Bullet Generation Error:', e);
      return [];
    }

    const data = this.cleanAndParseJSON(rawResponse);
    return data.bullets || [];
  }

  async *streamResumeBullets(jdText: string, userExperience: string) {
    const bullets = await this.generateResumeBullets(jdText, userExperience);
    for (const b of bullets) yield b;
  }
}

export default new JobDescriptionService();
