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
  private async extractWithGemini(jdText: string): Promise<IAIResumeResponse> {
    const schema = `{ "company_name": string, "job_role": string, "remote_or_not": string, "money": string }`;
    const prompt = `Extract these 4 things from the Job Description below and return as JSON:\n1. company_name\n2. job_role\n3. remote_or_not\n4. money\n\nJSON SCHEMA: ${schema}\n\nJD TEXT:\n${jdText}`;
    
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
        skills_nice_to_have: []
      };
    } catch (error) {
      console.error('Gemini Extraction Error:', error);
      return {
        company: 'Extraction Failed',
        role: 'Check JD Text',
        location: 'N/A',
        salaryRange: 'N/A',
        seniority: 'N/A',
        skills_required: [],
        skills_nice_to_have: []
      };
    }
  }

  /**
   * Use OpenAI to extract job details
   */
  private async extractWithOpenAI(jdText: string): Promise<IAIResumeResponse> {
    const schema = `{ "company_name": string, "job_role": string, "remote_or_not": string, "money": string }`;
    const prompt = `Extract these 4 things from the Job Description below and return as JSON:\n1. company_name\n2. job_role\n3. remote_or_not\n4. money\n\nJSON SCHEMA: ${schema}\n\nJD TEXT:\n${jdText}`;

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
      skills_nice_to_have: []
    };
  }

  /**
   * RAW GEMINI CALL with Robust Multi-Model Fallback
   */
  private async callGeminiRaw(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

    // List of models to try in order of stability and performance
    const modelsToTry = [
      process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro'
    ].filter((v, i, a) => a.indexOf(v) === i); // Unique models

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await axios.post(url, {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Lower temperature for more consistent JSON
            maxOutputTokens: 1024,
            responseMimeType: "application/json" // Force JSON output
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000 // 10s timeout per model
        });

        const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (resultText) return resultText;
      } catch (error: any) {
        console.warn(`[Gemini Fallback] Model ${model} failed. Trying next...`);
        lastError = error;
      }
    }

    throw new Error(`Gemini failed all fallback models: ${lastError?.message || 'Unknown Error'}`);
  }

  private cleanAndParseJSON(text: string): any {
    try {
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = cleanedText.indexOf('{');
      const end = cleanedText.lastIndexOf('}');
      if (start === -1 || end === -1) return {};
      return JSON.parse(cleanedText.substring(start, end + 1));
    } catch (e) {
      return {};
    }
  }

  /**
   * Main entry point to extract job details
   */
  async extractJobDetails(jdText: string): Promise<IAIResumeResponse> {
    if (process.env.USE_MOCK === 'true') {
      return { company: "Mock Co.", role: "Developer", skills_required: [], skills_nice_to_have: [], seniority: "Mid", location: "Remote" };
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
