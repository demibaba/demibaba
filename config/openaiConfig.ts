// config/openaiConfig.ts
interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export const OPENAI_CONFIG: OpenAIConfig = {
  apiKey: (process.env.OPENAI_API_KEY as string) || (process.env.EXPO_PUBLIC_OPENAI_API_KEY as string) || '',
  model: 'gpt-4o-mini',
  maxTokens: 1200,
  temperature: 0.2,
};


