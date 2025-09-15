// utils/emotionalRegulation.ts - 감정 조절 방식 분석
export interface EmotionalRegulation {
    strategy: 'suppression' | 'reappraisal' | 'avoidance' | 'expression';
    emotionalIntensity: number; // 0-100
    regulationSuccess: number; // 0-100  
    triggers: string[];
    copingMechanisms: string[];
  }
  
  const REGULATION_PATTERNS = {
    suppression: ['참았어', '꾹 눌렀어', '속으로만', '표현 안 했어'],
    reappraisal: ['다시 생각해보니', '긍정적으로 보면', '이해하려고'],
    avoidance: ['피했어', '안 만났어', '회피', '무시했어'],
    expression: ['말했어', '표현했어', '터뜨렸어', '울었어']
  };
  
  export function analyzeEmotionalRegulation(text: string): EmotionalRegulation {
    // 패턴 분석 로직
    const strategy = detectRegulationStrategy(text);
    const intensity = calculateEmotionalIntensity(text);
    
    return {
      strategy,
      emotionalIntensity: intensity,
      regulationSuccess: calculateSuccess(strategy, intensity),
      triggers: extractTriggers(text),
      copingMechanisms: suggestCoping(strategy)
    };
  }
  
  function detectRegulationStrategy(text: string): EmotionalRegulation['strategy'] {
    // 가장 많이 매칭되는 전략 반환
    return 'reappraisal'; // 임시
  }
  
  function calculateEmotionalIntensity(text: string): number {
    const intensityWords = ['너무', '정말', '진짜', '완전', '극도로'];
    return Math.min(100, intensityWords.filter(w => text.includes(w)).length * 20);
  }
  
  function calculateSuccess(strategy: string, intensity: number): number {
    if (strategy === 'reappraisal') return 80;
    if (strategy === 'suppression') return 40;
    return 60;
  }
  
  function extractTriggers(text: string): string[] {
    return ['업무 스트레스', '배우자 언행']; // 실제 구현 필요
  }
  
  function suggestCoping(strategy: string): string[] {
    const suggestions: Record<string, string[]> = {
      suppression: ['감정 일기 쓰기', '5분 명상'],
      reappraisal: ['현재 전략 유지', '파트너와 공유'],
      avoidance: ['직면 연습', '작은 대화부터'],
      expression: ['표현 방식 조절', '타이밍 선택']
    };
    return suggestions[strategy] || [];
  }