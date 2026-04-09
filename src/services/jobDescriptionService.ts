import OpenAI from 'openai';
import { IAIResumeResponse } from '../types';

class JobDescriptionService {
  private _openai: OpenAI | null = null;

  private getClient(): OpenAI {
    // If provider changes, we need to re-initialize the client
    const isGemini = process.env.AI_PROVIDER === 'gemini';
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in .env');
    }

    // Always re-initialize or cache based on provider for true modularity
    this._openai = new OpenAI({
      apiKey: apiKey,
      baseURL: isGemini
        ? process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/'
        : undefined, // Default OpenAI base URL
    });

    return this._openai;
  }

  private getModel(): string {
    const provider = process.env.AI_PROVIDER?.toLowerCase();
    if (provider === 'gemini') return 'models/gemini-2.0-flash';
    return 'gpt-4o-mini'; // Default to OpenAI's lightweight model
  }

  private async simulateDelay(ms: number = 2000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Safely extracts JSON from AI text with resilience for both providers */
  private extractJSON(text: string): any {
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = cleanedText.match(/\{[\s\S]*\}/);
    if (!match) {
       console.error('FAILED TO PARSE AI RESPONSE:', text);
       throw new Error('AI response did not contain a valid JSON object');
    }
    return JSON.parse(match[0]);
  }

  private buildJsonSystemPrompt(schema: string): string {
    return `Analyze the provided job description and extract data strictly into this JSON schema:\n${schema}\n\nRules:\n- Output ONLY valid JSON\n- Do not include markdown code blocks or explanations.`;
  }

  /**
   * Universal AI request wrapper with retries for 429 Rate Limiting
   */
  private async callAIWithRetry(messages: any[], isStreaming: boolean = false): Promise<any> {
    const maxRetries = 2;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        const response = await this.getClient().chat.completions.create({
          model: this.getModel(),
          messages,
          response_format: { type: "json_object" },
          stream: isStreaming,
        }, { timeout: 30000 });

        return response;
      } catch (error: any) {
        attempts++;
        const isRateLimit = error.status === 429 || error.message?.includes('429');
        
        if (isRateLimit && attempts <= maxRetries) {
          console.warn(`[AI SERVICE] Rate limit hit (429). Retry attempt ${attempts}/${maxRetries} after delay...`);
          await this.simulateDelay(2000 * attempts); // Exponential backoff (2s, 4s)
          continue;
        }
        
        console.error(`[AI SERVICE ERROR] Attempt ${attempts} failed:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Extracts structured information from a job description text.
   */
  async extractJobDetails(jdText: string): Promise<IAIResumeResponse> {
    if (process.env.USE_MOCK === 'true') {
      await this.simulateDelay(1500);
      return {
        company: "Mock AI Solutions Inc.",
        role: "Senior AI Integration Engineer",
        skills_required: ["React", "TypeScript", "Node.js", "OpenAI API"],
        skills_nice_to_have: ["Docker", "AWS", "GraphQL"],
        seniority: "Senior",
        location: "Remote",
      };
    }

    const schema = `{ "company": string, "role": string, "skills_required": string[], "skills_nice_to_have": string[], "seniority": string, "location": string }`;

    const response = await this.callAIWithRetry([
      { role: 'system', content: this.buildJsonSystemPrompt(schema) },
      { role: 'user', content: `Extract details from this JD:\n\n${jdText}` },
    ]);

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('AI returned an empty response');

    return this.extractJSON(content);
  }

  /**
   * Generates resume bullet points (Non-Streaming)
   */
  async generateResumeBullets(jdText: string, userExperience: string): Promise<string[]> {
    if (process.env.USE_MOCK === 'true') {
      return ["Led development of microservices.", "Optimized API throughput by 40%."];
    }

    const schema = `{ "bullets": string[] }`;
    const response = await this.callAIWithRetry([
      { role: 'system', content: this.buildJsonSystemPrompt(schema) + "\nGenerate 3-5 specific bullet points." },
      { role: 'user', content: `JD:\n${jdText}\n\nExperience:\n${userExperience}` },
    ]);

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('AI returned an empty response');
    const parsed = this.extractJSON(content);
    return parsed.bullets;
  }

  /**
   * Streaming version for Resume Bullets
   */
  async *streamResumeBullets(jdText: string, userExperience: string) {
    if (process.env.USE_MOCK === 'true') {
      const mockBullets = ["Optimized frontend state management using React Query.", "Integrated OpenAI streaming for real-time feedback."];
      for (const bullet of mockBullets) {
        await this.simulateDelay(500);
        yield bullet;
      }
      return;
    }

    const schema = `{ "bullets": string[] }`;
    
    // We don't use the retry wrapper for streaming directly as streaming state is harder to reset
    const stream = await this.getClient().chat.completions.create({
      model: this.getModel(),
      messages: [
        { role: 'system', content: this.buildJsonSystemPrompt(schema) + "\nGenerate 3-5 specific resume bullet points." },
        { role: 'user', content: `JD:\n${jdText}\n\nExp:\n${userExperience}` },
      ],
      stream: true,
    });

    let currentText = '';
    let lastYieldedBullets: string[] = [];

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      currentText += content;

      try {
        const match = currentText.match(/\{[\s\S]*\}/);
        if (match) {
           let jsonToParse = match[0];
           if (jsonToParse.includes('"bullets": [')) {
              const bulletsPart = jsonToParse.split('"bullets": [')[1];
              const bullets = bulletsPart.split(',').map(b => b.trim().replace(/^"/, '').replace(/"$/, '').replace(/\]$/, '').replace(/\}$/, '')).filter(b => b.length > 5);
              
              for (const bullet of bullets) {
                 if (!lastYieldedBullets.includes(bullet)) {
                    yield bullet;
                    lastYieldedBullets.push(bullet);
                 }
              }
           }
        }
      } catch (e) {
         // Silently wait for more buffer
      }
    }
  }
}

export default new JobDescriptionService();
