// utils/stressCoping.ts - 스트레스 대처법 분석
export interface StressCoping {
    copingStyle: 'problem-focused' | 'emotion-focused' | 'avoidance';
    stressLevel: number; // 0-100
    effectivenessScore: number;
    recommendations: string[];
  }
  
  export function analyzeStressCoping(text: string): StressCoping {
    const patterns = {
      problemFocused: ['해결', '계획', '방법 찾아', '대처'],
      emotionFocused: ['위로', '이해', '공감', '감정'],
      avoidance: ['잊어버려', '생각 안 해', '회피', '무시']
    };
    
    return {
      copingStyle: 'problem-focused',
      stressLevel: calculateStressLevel(text),
      effectivenessScore: 75,
      recommendations: [
        '문제 해결 중심 접근 유지',
        '감정적 지원도 병행',
        '배우자와 스트레스 공유'
      ]
    };
  }
  
  function calculateStressLevel(text: string): number {
    const stressWords = ['스트레스', '힘들', '지쳐', '짜증', '불안'];
    return Math.min(100, stressWords.filter(w => text.includes(w)).length * 20);
  }