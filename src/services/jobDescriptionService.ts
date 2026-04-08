import OpenAI from 'openai';
import { IAIResumeResponse } from '../types/index.js';

class JobDescriptionService {
  private _openai: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this._openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured');
      }

      const isGemini = process.env.AI_PROVIDER === 'gemini';
      this._openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: isGemini
          ? process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/'
          : undefined,
      });
    }
    return this._openai;
  }

  private getModel(): string {
    return process.env.AI_PROVIDER === 'gemini' ? 'models/gemini-2.0-flash' : 'gpt-4o-mini';
  }

  private async simulateDelay(ms: number = 2000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Safely extracts the first JSON object from a string */
  private extractJSON(text: string): any {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in AI response');
    return JSON.parse(match[0]);
  }

  private buildJsonSystemPrompt(schema: string): string {
    return `You are an expert AI assistant. You MUST respond with ONLY a valid JSON object — no markdown fences, no explanation. The JSON must strictly follow this schema:\n${schema}`;
  }

  /**
   * Extracts structured information from a job description text.
   */
  async extractJobDetails(jdText: string): Promise<IAIResumeResponse> {
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK === 'true') {
      await this.simulateDelay(2000);
      if (process.env.MOCK_ERROR === 'true') {
        throw new Error('500 - Simulated Internal Server Error (MOCK_ERROR is true)');
      }
      return {
        company: "Mock AI Solutions Inc.",
        role: "Senior AI Integration Engineer",
        skills_required: ["React", "TypeScript", "Node.js", "OpenAI API", "REST APIs"],
        skills_nice_to_have: ["Docker", "AWS", "GraphQL"],
        seniority: "Senior",
        location: "Remote",
      };
    }

    const schema = `{ "company": string, "role": string, "skills_required": string[], "skills_nice_to_have": string[], "seniority": string, "location": string }`;

    const response = await this.getClient().chat.completions.create({
      model: this.getModel(),
      messages: [
        {
          role: 'system',
          content: this.buildJsonSystemPrompt(schema),
        },
        {
          role: 'user',
          content: `Extract the job details from this job description:\n\n${jdText}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');

    return this.extractJSON(content) as IAIResumeResponse;
  }

  /**
   * Generates 3-5 specific resume bullet points tailored to the JD.
   */
  async generateResumeBullets(jdText: string, userExperience: string): Promise<string[]> {
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK === 'true') {
      await this.simulateDelay(2000);
      if (process.env.MOCK_ERROR === 'true') {
        throw new Error('500 - Simulated Internal Server Error (MOCK_ERROR is true)');
      }
      return [
        "Architected scalable backend infrastructure leveraging Node.js and TypeScript, increasing API response times by 35%.",
        "Integrated advanced OpenAI API endpoints utilizing json_object structural schemas for highly accurate data pipelines.",
        "Engineered React/Vite Kanban interfaces resulting in a dramatic enhancement in user application tracking experiences.",
        "Deployed JWT HttpOnly cookie authentication methodologies to definitively secure RESTful routes against XSS injection vectors.",
      ];
    }

    const schema = `{ "bullets": string[] }`;

    const response = await this.getClient().chat.completions.create({
      model: this.getModel(),
      messages: [
        {
          role: 'system',
          content: this.buildJsonSystemPrompt(schema) + '\nGenerate 3-5 highly specific, impact-driven resume bullet points tailored to the job description.',
        },
        {
          role: 'user',
          content: `Job Description:\n${jdText}\n\nUser Experience:\n${userExperience}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');

    const parsed = this.extractJSON(content) as { bullets: string[] };
    return parsed.bullets;
  }
}

export default new JobDescriptionService();
