// utils/coupleAnalyzer.ts
import { enhancedRelationshipAnalysis } from './enhancedOpenAI';

// 커플 역학 패턴 정의
type CoupleDynamic = {
  strengths: string[];
  challenges: string[];
  dynamics: string;
  recommendations: string[];
};

const COUPLE_DYNAMICS: Record<string, CoupleDynamic> = {
  // 애착유형 조합별 특성
  'secure-secure': {
    strengths: ['상호 신뢰', '건강한 갈등 해결', '안정적 지지'],
    challenges: ['성장 동기 부족 가능성'],
    dynamics: '이상적 안정형 커플',
    recommendations: ['새로운 도전과 성장 목표 설정', '루틴에 변화 주기']
  },
  'secure-anxious': {
    strengths: ['안정형의 일관된 지지', '불안형의 깊은 애정'],
    challenges: ['불안형의 과도한 확인 요구'],
    dynamics: '안정형이 불안형에게 안정감 제공하는 구조',
    recommendations: ['불안형: 안정형의 일관성 믿기', '안정형: 더 자주 재확인해주기']
  },
  'secure-avoidant': {
    strengths: ['안정형의 인내심', '회피형의 독립성'],
    challenges: ['회피형의 감정 표현 어려움'],
    dynamics: '안정형이 회피형의 감정 표현을 서서히 이끌어내는 구조',
    recommendations: ['회피형: 작은 감정부터 표현하기', '안정형: 강요하지 않고 기다리기']
  },
  'anxious-anxious': {
    strengths: ['깊은 감정적 공감', '상호 이해'],
    challenges: ['상호 불안 증폭', '과도한 감정 기복'],
    dynamics: '감정적 동조가 높지만 불안 증폭 위험',
    recommendations: ['한 명이 침착할 때 상대방 안정시키기', '감정 조절 기법 함께 연습']
  },
  'anxious-avoidant': {
    strengths: ['상호 보완적 성향'],
    challenges: ['추격-회피 패턴', '소통 단절'],
    dynamics: '가장 도전적인 조합 - 추격-회피 사이클',
    recommendations: ['불안형: 추격 중단하기', '회피형: 작은 접근 시도하기', '중립 지대에서 만나기']
  },
  'avoidant-avoidant': {
    strengths: ['상호 독립성 인정', '갈등 회피'],
    challenges: ['감정적 친밀감 부족', '소통 부족'],
    dynamics: '평행선을 달리는 관계 - 안전하지만 거리감',
    recommendations: ['의도적 친밀감 시간 만들기', '감정 나누기 연습', '물리적 접촉 늘리기']
  }
};

// 성격유형 조합별 소통 스타일
const COMMUNICATION_STYLES = {
  'E-I': { 
    pattern: '외향형이 더 많이 말하고 내향형이 듣는 구조',
    tips: ['외향형: 내향형의 침묵을 압박하지 말기', '내향형: 생각을 정리해서 표현하기'],
    idealTime: '내향형이 편안한 시간대에 대화하기'
  },
  'S-N': {
    pattern: '감각형은 구체적, 직관형은 추상적',
    tips: ['감각형: 큰 그림도 고려해보기', '직관형: 구체적 계획과 예시 들기'],
    idealTime: '서로의 관점을 번갈아 적용해보기'
  },
  'T-F': {
    pattern: '사고형은 논리적, 감정형은 감정적',
    tips: ['사고형: 상대방 감정 먼저 인정하기', '감정형: 논리적 근거도 제시하기'],
    idealTime: '갈등 시 냉정기 후 대화하기'
  },
  'J-P': {
    pattern: '판단형은 계획적, 인식형은 유연',
    tips: ['판단형: 갑작스런 변화에 유연하게', '인식형: 중요한 약속은 지키기'],
    idealTime: '계획과 즉흥성의 균형 찾기'
  }
};

// 감정 상호작용 패턴 분석
function analyzeEmotionalInteraction(myEmotions: any, spouseEmotions: any, dateRange: string[]) {
  const interactions: {
    synchrony: number;
    support: number;
    influence: number;
    patterns: string[];
    concerns: string[];
    strengths: string[];
  } = {
    synchrony: 0,        // 감정 동조율
    support: 0,          // 상호 지지 패턴
    influence: 0,        // 감정 영향력
    patterns: [],
    concerns: [],
    strengths: []
  };
  
  let syncCount = 0;
  let supportCount = 0;
  let totalDays = 0;
  
  dateRange.forEach(date => {
    const myEmotion = myEmotions[date];
    const spouseEmotion = spouseEmotions[date];
    
    if (myEmotion && spouseEmotion) {
      totalDays++;
      
      // 감정 동조율 계산
      const myScore = getEmotionScore(myEmotion);
      const spouseScore = getEmotionScore(spouseEmotion);
      const diff = Math.abs(myScore - spouseScore);
      
      if (diff <= 1) { // 비슷한 감정 상태
        syncCount++;
      }
      
      // 상호 지지 패턴 감지
      if ((myScore <= 2 && spouseScore >= 4) || (myScore >= 4 && spouseScore <= 2)) {
        supportCount++; // 한 명이 안 좋을 때 다른 명이 좋은 상태
      }
    }
  });
  
  if (totalDays > 0) {
    interactions.synchrony = Math.round((syncCount / totalDays) * 100);
    interactions.support = Math.round((supportCount / totalDays) * 100);
  }
  
  // 패턴 분석
  if (interactions.synchrony > 70) {
    interactions.strengths.push('높은 감정 동조율 - 서로의 감정을 잘 이해함');
  } else if (interactions.synchrony < 30) {
    interactions.concerns.push('감정 동조율이 낮음 - 서로의 감정 상태를 더 파악해보세요');
  }
  
  if (interactions.support > 40) {
    interactions.strengths.push('좋은 상호 지지 패턴 - 어려울 때 서로 도움이 됨');
  } else if (interactions.support < 20) {
    interactions.concerns.push('상호 지지가 부족 - 상대방이 힘들 때 더 관심 가져보세요');
  }
  
  return interactions;
}

// 감정을 점수로 변환 (1-5)
function getEmotionScore(emotion: string): number {
  const scores: Record<string, number> = {
    terrible: 1,
    bad: 2, 
    neutral: 3,
    good: 4,
    great: 5
  };
  return scores[emotion] ?? 3;
}

// 정신건강 상호 영향 분석
function analyzeMentalHealthInteraction(myHealth: any, spouseHealth: any) {
  const analysis: {
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    supportStrategy: string;
    warnings: string[];
    recommendations: string[];
  } = {
    riskLevel: 'low',
    supportStrategy: '',
    warnings: [],
    recommendations: []
  };
  
  const myRisk = myHealth.riskLevel;
  const spouseRisk = spouseHealth.riskLevel;
  
  // 상호 위험도 평가
  if (myRisk === 'high' && spouseRisk === 'high') {
    analysis.riskLevel = 'critical';
    analysis.warnings.push('⚠️ 둘 다 높은 스트레스 상태 - 즉시 전문가 도움 필요');
    analysis.supportStrategy = '전문가 상담과 함께 서로에게 과도한 부담 주지 않기';
  } else if (myRisk === 'high' || spouseRisk === 'high') {
    analysis.riskLevel = 'high';
    const healthyPartner = myRisk === 'high' ? '상대방' : '나';
    analysis.supportStrategy = `${healthyPartner}이 안정적 지지 역할, 번아웃 주의`;
    analysis.recommendations.push('건강한 쪽이 과도한 케어 부담 갖지 않기');
  } else if (myRisk === 'moderate' && spouseRisk === 'moderate') {
    analysis.riskLevel = 'moderate';
    analysis.supportStrategy = '서로 번갈아가며 지지하고 함께 스트레스 관리';
  } else {
    analysis.riskLevel = 'low';
    analysis.supportStrategy = '현재 상태 유지하며 예방적 관리';
  }
  
  return analysis;
}

// 커플 맞춤형 활동 추천
function generateCoupleActivities(myProfile: any, spouseProfile: any, emotionalInteraction: any) {
  const activities = [];
  
  // 애착유형 기반 활동
  const myAttachment = myProfile.attachmentType;
  const spouseAttachment = spouseProfile.attachmentType;
  
  if (myAttachment === 'anxious' || spouseAttachment === 'anxious') {
    activities.push({
      type: 'attachment',
      title: '안정감 증진 활동',
      description: '매일 10분 서로에게 오늘 고마웠던 점 3가지 말하기',
      frequency: '매일'
    });
  }
  
  if (myAttachment === 'avoidant' || spouseAttachment === 'avoidant') {
    activities.push({
      type: 'attachment',
      title: '점진적 친밀감 활동',
      description: '일주일에 2번, 15분간 나란히 앉아서 각자 책 읽기 (말 안 해도 됨)',
      frequency: '주 2회'
    });
  }
  
  // 감정 동조율 기반 활동
  if (emotionalInteraction.synchrony < 50) {
    activities.push({
      type: 'emotional',
      title: '감정 체크인',
      description: '저녁 8시마다 서로의 감정 상태를 1-10 점수로 공유하기',
      frequency: '매일'
    });
  }
  
  // 상호 지지 강화 활동
  if (emotionalInteraction.support < 30) {
    activities.push({
      type: 'support',
      title: '지지 신호 만들기',
      description: '상대방이 힘들어 보일 때 사용할 비언어적 신호 정하기 (어깨 두드리기 등)',
      frequency: '필요시'
    });
  }
  
  return activities;
}

// 갈등 해결 전략 (애착유형별)
function generateConflictStrategies(myAttachment: string, spouseAttachment: string) {
  const key = `${myAttachment}-${spouseAttachment}`;
  const reverseKey = `${spouseAttachment}-${myAttachment}`;
  
  const strategies: Record<string, string[]> = {
    'secure-anxious': [
      '불안형: 감정을 구체적으로 표현하기 ("당신이 늦으면 버려질까봐 불안해요")',
      '안정형: 재확인을 귀찮아하지 말고 자주 해주기',
      '갈등 시: 안정형이 먼저 안정감을 주고 문제 해결하기'
    ],
    'secure-avoidant': [
      '회피형: "시간이 필요해요"라고 명확히 소통하기',
      '안정형: 회피형에게 충분한 시간 주기',
      '갈등 시: 강요하지 말고 회피형이 준비될 때까지 기다리기'
    ],
    'anxious-avoidant': [
      '불안형: 추격하지 말고 자신의 불안 먼저 달래기',
      '회피형: 완전히 벽을 치지 말고 "괜찮다"는 신호라도 주기',
      '갈등 시: 중립 지대(카페 등)에서 만나서 대화하기',
      '타임아웃: 각자 30분 진정 시간 후 다시 만나기'
    ],
    'anxious-anxious': [
      '둘 다 감정적일 때: 한 명은 의도적으로 침착함 유지하기',
      '감정 증폭 방지: "우리 둘 다 흥분했으니 10분 후 다시 얘기하자"',
      '갈등 시: 감정 인정 → 문제 분리 → 해결책 찾기 순서'
    ],
    'avoidant-avoidant': [
      '둘 다 회피하지 말고 누군가는 먼저 입 열기',
      '정해진 시간에 정해진 장소에서 대화하기 (즉흥성 X)',
      '갈등 시: 이메일이나 메모로 먼저 생각 정리해서 전달하기'
    ]
  };
  
  return strategies[key] || strategies[reverseKey] || [
    '서로의 애착 스타일을 이해하고 인정하기',
    '갈등은 관계를 망가뜨리는 것이 아니라 성장의 기회로 보기',
    '완벽한 해결보다는 서로 노력하는 과정 인정하기'
  ];
}

// 통합 커플 분석 함수
export async function analyzeCoupleRelationship(myData: any, spouseData: any, relationshipHistory: any[] = []) {
  console.log('커플 통합 분석 시작:', { myId: myData.userId, spouseId: spouseData.userId });
  
  // 1. 각자의 개인 분석 먼저 수행
  const [myAnalysis, spouseAnalysis] = await Promise.all([
    enhancedRelationshipAnalysis(myData, relationshipHistory.filter(h => h.userId === myData.userId)),
    enhancedRelationshipAnalysis(spouseData, relationshipHistory.filter(h => h.userId === spouseData.userId))
  ]);
  
  // 2. 커플 역학 분석
  const coupleKey = `${myData.attachmentType}-${spouseData.attachmentType}`;
  const reverseKey = `${spouseData.attachmentType}-${myData.attachmentType}`;
  const coupleDynamics: CoupleDynamic =
    COUPLE_DYNAMICS[coupleKey] ||
    COUPLE_DYNAMICS[reverseKey] ||
    { strengths: [], challenges: [], dynamics: '일반 커플', recommendations: [] };
  
  // 3. 감정 상호작용 분석
  const dateRange = getLast7Days();
  const emotionalInteraction = analyzeEmotionalInteraction(
    myData.dailyEmotions, 
    spouseData.dailyEmotions, 
    dateRange
  );
  
  // 4. 정신건강 상호 영향 분석
  const mentalHealthInteraction = analyzeMentalHealthInteraction(
    myAnalysis.quantitativeInsights.mentalHealth,
    spouseAnalysis.quantitativeInsights.mentalHealth
  );
  
  // 5. 성격유형 호환성 (MBTI가 있는 경우)
  let personalityAnalysis = null;
  if (myData.personalityType && spouseData.personalityType) {
    personalityAnalysis = analyzePersonalityCompatibility(myData.personalityType, spouseData.personalityType);
  }
  
  // 6. 커플 맞춤 활동 및 전략
  const coupleActivities = generateCoupleActivities(myData, spouseData, emotionalInteraction);
  const conflictStrategies = generateConflictStrategies(myData.attachmentType, spouseData.attachmentType);
  
  // 7. 관계 건강도 종합 점수
  const relationshipHealthScore = calculateRelationshipHealth(
    myAnalysis.quantitativeInsights.overallScore,
    spouseAnalysis.quantitativeInsights.overallScore,
    emotionalInteraction,
    mentalHealthInteraction
  );
  
  // 8. 커플 레포트 생성
  return {
    // 개인 분석 요약
    individualSummary: {
      my: {
        name: myData.name || '나',
        score: myAnalysis.quantitativeInsights.overallScore,
        attachment: myAnalysis.quantitativeInsights.attachmentProfile.name,
        mentalHealth: `우울 ${myAnalysis.quantitativeInsights.mentalHealth.depression.level}, 불안 ${myAnalysis.quantitativeInsights.mentalHealth.anxiety.level}`,
        mainConcerns: (myAnalysis.quantitativeInsights.emotionPatterns.concerns.slice(0, 2).filter(Boolean) as string[])
      },
      spouse: {
        name: spouseData.name || '상대방',
        score: spouseAnalysis.quantitativeInsights.overallScore,
        attachment: spouseAnalysis.quantitativeInsights.attachmentProfile.name,
        mentalHealth: `우울 ${spouseAnalysis.quantitativeInsights.mentalHealth.depression.level}, 불안 ${spouseAnalysis.quantitativeInsights.mentalHealth.anxiety.level}`,
        mainConcerns: (spouseAnalysis.quantitativeInsights.emotionPatterns.concerns.slice(0, 2).filter(Boolean) as string[])
      }
    },
    
    // 커플 역학 분석
    coupleDynamics: {
      overallScore: relationshipHealthScore,
      attachmentPattern: coupleDynamics,
      emotionalInteraction,
      mentalHealthInteraction,
      personalityMatch: personalityAnalysis
    },
    
    // 이번 주 관계 하이라이트
    weeklyHighlights: {
      bestMoments: findPositiveSync(myData.dailyEmotions, spouseData.dailyEmotions),
      challengingMoments: findNegativePatterns(myData.dailyEmotions, spouseData.dailyEmotions),
      supportMoments: findSupportPatterns(myData.dailyEmotions, spouseData.dailyEmotions),
      growthAreas: identifyGrowthAreas(emotionalInteraction, mentalHealthInteraction)
    },
    
    // 맞춤형 권장사항
    coupleRecommendations: {
      immediate: generateImmediateActions(mentalHealthInteraction, emotionalInteraction),
      weekly: coupleActivities,
      conflictResolution: conflictStrategies,
      longTerm: generateLongTermGoals(coupleDynamics, relationshipHealthScore)
    },
    
    // 관계 성장 지표
    progressIndicators: {
      emotionalConnection: emotionalInteraction.synchrony,
      mutualSupport: emotionalInteraction.support,
      overallHealth: relationshipHealthScore,
      trendDirection: calculateTrendDirection(relationshipHistory)
    },
    
    // 위험 신호 및 조기 경고
    alerts: generateCoupleAlerts(mentalHealthInteraction, emotionalInteraction, relationshipHealthScore),
    
    // 성공 사례 및 격려
    strengths: [
      ...emotionalInteraction.strengths,
      ...coupleDynamics.strengths,
      ...(personalityAnalysis?.tips ?? [])
    ],
    
    disclaimer: "본 분석은 두 분의 데이터를 종합하여 관계 패턴을 분석한 것으로, 관계 상담 전문가의 조언을 대체하지 않습니다."
  };
}

// 헬퍼 함수들
function getLast7Days(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const iso = date.toISOString();
    dates.push(iso.slice(0, 10));
  }
  return dates;
}

function analyzePersonalityCompatibility(myType: string, spouseType: string) {
  const differences: string[] = [];
  const commonalities: string[] = [];
  const tips: string[] = [];
  
  // 각 차원별 분석
  if (myType[0] !== spouseType[0]) { // E-I
    differences.push('에너지 충전 방식이 다름');
    tips.push('외향형은 내향형에게 혼자만의 시간 주기, 내향형은 사회적 활동 가끔 함께하기');
  } else {
    commonalities.push('비슷한 에너지 패턴');
  }
  
  // 나머지 차원들도 비슷하게...
  
  return { differences, commonalities, tips, compatibilityScore: 75 };
}

function calculateRelationshipHealth(myScore: number, spouseScore: number, emotionalInteraction: any, mentalHealthInteraction: any): number {
  const avgIndividualScore = (myScore + spouseScore) / 2;
  const interactionBonus = (emotionalInteraction.synchrony + emotionalInteraction.support) / 2;
  const riskPenalty = mentalHealthInteraction.riskLevel === 'critical' ? -20 : 
                     mentalHealthInteraction.riskLevel === 'high' ? -10 : 0;
  
  return Math.max(0, Math.min(100, avgIndividualScore + (interactionBonus / 10) + riskPenalty));
}

function findPositiveSync(myEmotions: any, spouseEmotions: any): string[] {
  const moments: string[] = [];
  const dates = getLast7Days();
  
  dates.forEach(date => {
    const my = myEmotions[date];
    const spouse = spouseEmotions[date];
    
    if (my && spouse && (my === 'great' || my === 'good') && (spouse === 'great' || spouse === 'good')) {
      moments.push(`${date}: 둘 다 좋은 하루를 보냄`);
    }
  });
  
  return moments;
}

function findNegativePatterns(myEmotions: any, spouseEmotions: any): string[] {
  const patterns: string[] = [];
  // 부정적 패턴 감지 로직
  return patterns;
}

function findSupportPatterns(myEmotions: any, spouseEmotions: any): string[] {
  const supports: string[] = [];
  // 상호 지지 패턴 감지 로직
  return supports;
}

function identifyGrowthAreas(emotionalInteraction: any, mentalHealthInteraction: any): string[] {
  const areas = [];
  
  if (emotionalInteraction.synchrony < 50) {
    areas.push('감정 소통 개선');
  }
  
  if (emotionalInteraction.support < 30) {
    areas.push('상호 지지 강화');
  }
  
  if (mentalHealthInteraction.riskLevel !== 'low') {
    areas.push('스트레스 관리');
  }
  
  return areas;
}

function generateImmediateActions(mentalHealthInteraction: any, emotionalInteraction: any): any[] {
  const actions = [];
  
  if (mentalHealthInteraction.riskLevel === 'critical') {
    actions.push({
      priority: 'urgent',
      action: '전문가 상담 예약하기',
      timeline: '이번 주 내'
    });
  }
  
  if (emotionalInteraction.concerns.length > 0) {
    actions.push({
      priority: 'important',
      action: '매일 감정 체크인 시간 정하기',
      timeline: '오늘부터'
    });
  }
  
  return actions;
}

function generateLongTermGoals(coupleDynamics: any, healthScore: number): any[] {
  const goals = [];
  
  if (healthScore < 70) {
    goals.push({
      goal: '관계 만족도 80점 달성',
      timeline: '3개월',
      steps: coupleDynamics.recommendations
    });
  }
  
  return goals;
}

function calculateTrendDirection(history: any[]): string {
  if (history.length < 2) return 'insufficient_data';
  
  // 트렌드 계산 로직
  return 'improving'; // 또는 'stable', 'declining'
}

function generateCoupleAlerts(mentalHealthInteraction: any, emotionalInteraction: any, healthScore: number): any[] {
  const alerts = [];
  
  if (mentalHealthInteraction.riskLevel === 'critical') {
    alerts.push({
      level: 'critical',
      message: '둘 다 높은 스트레스 상태',
      action: '즉시 전문가 도움 받기'
    });
  }
  
  if (emotionalInteraction.synchrony < 20) {
    alerts.push({
      level: 'warning',
      message: '감정적 연결이 약해짐',
      action: '더 많은 소통 시간 갖기'
    });
  }
  
  return alerts;
}