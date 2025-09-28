// config/openaiConfig.ts - 임시 하드코딩 버전
interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export const OPENAI_CONFIG: OpenAIConfig = {
  apiKey: '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',
  model: 'gpt-4o-mini',
  maxTokens: 1200,
  temperature: 0.2,
};

console.log('하드코딩된 API 키 설정됨:', !!OPENAI_CONFIG.apiKey);
// config/openaiConfig.ts
console.warn('🔥 이 메시지가 보이나요?'); // 더 눈에 띄게
console.error('🚨 에러 레벨 로그 테스트');
console.log('=== 환경변수 디버깅 ===');