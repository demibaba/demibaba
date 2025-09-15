// utils/decisionPatterns.ts - 의사결정 패턴 분석
export interface DecisionPattern {
    style: 'collaborative' | 'dominant' | 'avoidant' | 'compromising';
    decisionSpeed: 'fast' | 'moderate' | 'slow';
    conflictFrequency: number;
    satisfactionLevel: number;
  }
  
  export function analyzeDecisionPattern(text: string): DecisionPattern {
    const patterns = {
      collaborative: ['함께 결정', '의논해서', '같이 정했'],
      dominant: ['내가 정했', '내 마음대로', '일방적으로'],
      avoidant: ['미뤘어', '결정 못했', '나중에'],
      compromising: ['중간에서', '양보했', '타협']
    };
    
    // 분석 로직
    return {
      style: 'collaborative',
      decisionSpeed: 'moderate',
      conflictFrequency: 2,
      satisfactionLevel: 75
    };
  }