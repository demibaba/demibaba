export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  model: 'gpt-4o-mini',
  maxTokens: 1200,
  temperature: 0.2,
};


