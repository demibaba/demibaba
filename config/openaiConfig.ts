// config/openaiConfig.ts - 임시 하드코딩 버전
interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export const OPENAI_CONFIG: OpenAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  model: 'gpt-4o-mini',
  maxTokens: 1200,
  temperature: 0.2,
};

console.log('하드코딩된 API 키 설정됨:', !!OPENAI_CONFIG.apiKey);
// config/openaiConfig.ts
