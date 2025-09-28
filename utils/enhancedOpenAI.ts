// utils/enhancedAnalyzer.ts
import { analyzeRelationshipData, formatAnalysisAsText } from './aiAnalyzer';

// 애착유형별 특성 정의
const ATTACHMENT_PROFILES = {
  secure: {
    name: '안정형',
    strengths: ['안정적인 관계 유지', '갈등 해결 능력', '감정 조절'],
    challenges: ['과도한 배려로 인한 피로'],
    relationshipTips: ['직접적인 소통', '감정 표현 격려', '일정한 루틴 유지'],
    warningSign: '번아웃 주의',
    idealPartner: ['secure', 'anxious']
  },
  anxious: {
    name: '불안형', 
    strengths: ['깊은 애정 표현', '관계에 대한 열정', '세심한 배려'],
    challenges: ['거절에 대한 두려움', '과도한 확인 요구', '감정 기복'],
    relationshipTips: ['안정감 제공받기', '일관된 피드백 요청', '작은 성취 인정받기'],
    warningSign: '과도한 재확인 행동',
    idealPartner: ['secure']
  },
  avoidant: {
    name: '회피형',
    strengths: ['독립성', '문제 해결 능력', '냉정한 판단'],
    challenges: ['감정 표현 어려움', '친밀감 회피', '소통 부족'],
    relationshipTips: ['점진적 친밀감 구축', '비언어적 표현 활용', '개인 공간 인정'],
    warningSign: '지나친 거리두기',
    idealPartner: ['secure']
  },
  fearfulAvoidant: {
    name: '혼란형',
    strengths: ['깊은 감정 이해', '복잡한 상황 인식'],
    challenges: ['일관성 부족', '극단적 반응', '자기 의심'],
    relationshipTips: ['안정적 환경 조성', '예측 가능한 패턴', '전문가 도움'],
    warningSign: '감정 극단화',
    idealPartner: ['secure']
  }
};

// MBTI/성격유형별 관계 스타일
const PERSONALITY_TRAITS = {
  // 외향성-내향성
  'E': { communication: '적극적 대화', conflict: '즉시 해결', support: '사회적 활동' },
  'I': { communication: '깊이 있는 대화', conflict: '시간을 두고 해결', support: '조용한 환경' },
  
  // 감각-직관
  'S': { focus: '현재와 구체적 사실', planning: '단계적 접근', gift: '실용적 선물' },
  'N': { focus: '미래와 가능성', planning: '큰 그림', gift: '의미있는 경험' },
  
  // 사고-감정
  'T': { decision: '논리적 분석', feedback: '직접적 피드백', stress: '문제 해결' },
  'F': { decision: '감정과 가치', feedback: '배려 있는 피드백', stress: '공감과 위로' },
  
  // 판단-인식
  'J': { lifestyle: '계획적', routine: '규칙적 루틴', change: '점진적 변화' },
  'P': { lifestyle: '유연한', routine: '자유로운 스케줄', change: '즉흥적 변화' }
};

// KSMI (한국형 결혼만족도) 해석
const KSMI_INTERPRETATION = {
  80: { level: '매우 높음', status: '이상적', advice: '현재 상태 유지에 집중' },
  60: { level: '높음', status: '양호', advice: '소소한 개선점 찾기' },
  40: { level: '보통', status: '주의', advice: '적극적 관계 개선 필요' },
  20: { level: '낮음', status: '위험', advice: '전문가 상담 권장' },
  0: { level: '매우 낮음', status: '심각', advice: '즉시 전문가 개입 필요' }
};

// 우울/불안 점수 해석
function interpretMentalHealth(phq9: number, gad7: number) {
  const depression = phq9 >= 15 ? 'severe' : phq9 >= 10 ? 'moderate' : phq9 >= 5 ? 'mild' : 'minimal';
  const anxiety = gad7 >= 15 ? 'severe' : gad7 >= 10 ? 'moderate' : gad7 >= 5 ? 'mild' : 'minimal';
  
  return {
    depression: { level: depression, score: phq9 },
    anxiety: { level: anxiety, score: gad7 },
    riskLevel: (phq9 >= 15 || gad7 >= 15) ? 'high' : (phq9 >= 10 || gad7 >= 10) ? 'moderate' : 'low',
    recommendations: generateMentalHealthRecs(depression, anxiety),
    relationshipImpact: assessRelationshipImpact(phq9, gad7)
  };
}

function generateMentalHealthRecs(depression: string, anxiety: string): string[] {
  const recs = [];
  
  if (depression !== 'minimal') {
    recs.push('규칙적인 수면과 운동 패턴 유지 (매일 30분 이상)');
    recs.push('긍정적 활동 일주일에 3회 이상 (취미, 산책, 음악 등)');
    recs.push('일일 감사 3가지 기록하기');
  }
  
  if (anxiety !== 'minimal') {
    recs.push('4-7-8 호흡법 매일 5분씩 연습');
    recs.push('카페인 섭취량 하루 1잔으로 제한');
    recs.push('걱정 시간 정하기 (하루 15분)');
  }
  
  if (depression === 'severe' || anxiety === 'severe') {
    recs.push('⚠️ 즉시 전문가 상담을 받으세요');
  }
  
  return recs;
}

function assessRelationshipImpact(phq9: number, gad7: number): string {
  if (phq9 >= 15 || gad7 >= 15) {
    return '정신건강 상태가 관계에 상당한 영향을 미칠 수 있습니다. 배우자와의 소통이 더욱 중요합니다.';
  } else if (phq9 >= 10 || gad7 >= 10) {
    return '스트레스가 관계에 영향을 줄 수 있습니다. 배우자의 이해와 지지가 필요합니다.';
  }
  return '정신건강이 관계에 긍정적으로 작용하고 있습니다.';
}

// KSMI 점수 해석
function interpretKSMI(score: number) {
  const ranges = Object.keys(KSMI_INTERPRETATION).map(k => parseInt(k)).sort((a, b) => b - a);
  const range = ranges.find(r => score >= r) || 0;
  return KSMI_INTERPRETATION[range as keyof typeof KSMI_INTERPRETATION];
}

// 성격유형 분석 (MBTI 기반)
function analyzePersonalityMatch(myType?: string, spouseType?: string) {
  if (!myType || !spouseType) return null;
  
  const myTraits = {
    EI: myType[0],
    SN: myType[1], 
    TF: myType[2],
    JP: myType[3]
  };
  
  const spouseTraits = {
    EI: spouseType[0],
    SN: spouseType[1],
    TF: spouseType[2], 
    JP: spouseType[3]
  };
  
  const compatibility = {
    communication: myTraits.EI === spouseTraits.EI ? 'similar' : 'complementary',
    perspective: myTraits.SN === spouseTraits.SN ? 'similar' : 'different',
    decision: myTraits.TF === spouseTraits.TF ? 'similar' : 'balanced',
    lifestyle: myTraits.JP === spouseTraits.JP ? 'similar' : 'flexible'
  };
  
  const tips = [];
  if (compatibility.communication === 'complementary') {
    tips.push('소통 스타일이 다르니 상대방의 방식 이해하기');
  }
  if (compatibility.perspective === 'different') {
    tips.push('서로 다른 관점이 관계를 풍부하게 만들 수 있음');
  }
  if (compatibility.decision === 'balanced') {
    tips.push('의사결정시 논리와 감정 모두 고려하기');
  }
  
  return { compatibility, tips };
}

// 커플 호환성 종합 분석
function analyzeCoupleCompatibility(myAttachment: string, spouseAttachment: string, myType?: string, spouseType?: string) {
  // 애착유형 호환성
  const combinations: Record<string, { score: number; note: string }> = {
    'secure-secure': { score: 95, note: '이상적인 조합으로 안정적 관계 유지 가능' },
    'secure-anxious': { score: 85, note: '안정형의 일관성이 불안형에게 안정감 제공' },
    'secure-avoidant': { score: 80, note: '안정형이 점진적 친밀감 구축에 도움' },
    'secure-fearfulAvoidant': { score: 75, note: '안정형의 일관성이 혼란형에게 도움' },
    'anxious-anxious': { score: 60, note: '감정적 공감대는 높으나 상호 불안 증폭 위험' },
    'anxious-avoidant': { score: 45, note: '추격-회피 패턴 발생 가능, 의식적 노력 필요' },
    'anxious-fearfulAvoidant': { score: 50, note: '불안정한 조합, 전문가 도움 권장' },
    'avoidant-avoidant': { score: 70, note: '독립성 인정하되 의도적 친밀감 노력 필요' },
    'avoidant-fearfulAvoidant': { score: 55, note: '소통 부족 위험, 적극적 대화 필요' },
    'fearfulAvoidant-fearfulAvoidant': { score: 40, note: '불안정한 조합, 전문가 상담 필요' }
  };
  
  const key = `${myAttachment}-${spouseAttachment}`;
  const reverseKey = `${spouseAttachment}-${myAttachment}`;
  const attachmentMatch = combinations[key] || combinations[reverseKey] || { score: 75, note: '상호 이해와 노력으로 발전 가능' };
  
  // 성격유형 호환성 (있는 경우)
  const personalityMatch = analyzePersonalityMatch(myType, spouseType);
  
  return {
    attachmentCompatibility: attachmentMatch,
    personalityCompatibility: personalityMatch,
    overallScore: personalityMatch ? 
      Math.round((attachmentMatch.score + 75) / 2) : // 성격유형이 있으면 평균
      attachmentMatch.score
  };
}

// 감정 패턴 심화 분석
function analyzeEmotionPatterns(emotionSummary: any, diaryStats: any) {
  const { positive, negative, neutral, topEmotions } = emotionSummary;
  const { daysActive, totalEntries, avgWordsPerEntry, keywords } = diaryStats;
  
  const patterns = [];
  const concerns = [];
  const insights = [];
  const recommendations = [];
  
  // 감정 분포 분석
  if (negative > 60) {
    concerns.push('부정 감정 비율이 높습니다 (60%+)');
    patterns.push('감정 조절 전략이 필요한 상황');
    recommendations.push('긍정적 활동 늘리기: 매일 1가지 즐거운 일 찾기');
  } else if (positive > 70) {
    insights.push('전반적으로 긍정적인 감정 상태를 유지하고 있습니다');
  }
  
  if (negative > 40 && neutral < 20) {
    concerns.push('감정의 극단화 경향 - 중간 감정 표현 연습 필요');
  }
  
  // 기록 일관성 분석
  const consistency = daysActive / 7;
  if (consistency >= 0.7) {
    insights.push('꾸준한 자기 관찰로 높은 자기 인식을 보입니다');
  } else if (consistency < 0.4) {
    patterns.push('불규칙한 기록 패턴 - 습관화가 필요합니다');
    recommendations.push('매일 같은 시간에 기록하는 루틴 만들기');
  }
  
  // 작성 깊이 분석
  if (avgWordsPerEntry < 10) {
    patterns.push('간단한 기록 패턴 - 더 자세한 감정 표현 필요');
    recommendations.push('왜 그런 감정이 들었는지 구체적으로 적어보기');
  } else if (avgWordsPerEntry > 50) {
    insights.push('깊이 있는 자기 성찰을 하고 있습니다');
  }
  
  // 감정 다양성 분석
  if (topEmotions.length <= 2) {
    patterns.push('감정 표현의 다양성 확장 필요');
    recommendations.push('감정 단어 목록을 활용해 더 구체적인 감정 표현하기');
  }
  
  // 키워드 기반 관계 분석
  const relationshipKeywords = ['사랑', '대화', '데이트', '갈등', '이해', '화', '행복'];
  const foundRelationshipKeywords = keywords?.filter((k: string) => 
    relationshipKeywords.some(rk => k.includes(rk))
  ) || [];
  
  if (foundRelationshipKeywords.length > 0) {
    insights.push(`관계 중심적 사고: ${foundRelationshipKeywords.join(', ')}`);
  }
  
  return { 
    patterns, 
    concerns, 
    insights, 
    recommendations,
    emotionalStability: positive - negative,
    consistency: Math.round(consistency * 100)
  };
}

// 주별 감정 트렌드 분석
function analyzeWeeklyTrends(currentWeek: any, previousWeeks: any[] = []) {
  if (!previousWeeks.length) return null;
  
  const trends = {
    emotion: 'stable',
    activity: 'stable',
    concerns: [] as string[]
  };
  
  const prevWeek = previousWeeks[0];
  if (prevWeek) {
    const emotionChange = currentWeek.emotionSummary.positive - prevWeek.emotionSummary.positive;
    
    if (emotionChange > 20) {
      trends.emotion = 'improving';
    } else if (emotionChange < -20) {
      trends.emotion = 'declining';
      trends.concerns.push('감정 상태가 하락하고 있습니다. 원인을 파악해보세요.');
    }
    
    const activityChange = currentWeek.diaryStats.daysActive - prevWeek.diaryStats.daysActive;
    if (activityChange < -2) {
      trends.activity = 'declining';
      trends.concerns.push('기록 활동이 줄어들고 있습니다. 동기를 회복해보세요.');
    }
  }
  
  return trends;
}

// 통합 분석 함수
export async function enhancedRelationshipAnalysis(data: any, previousWeeks: any[] = []) {
  const {
    phq9Score = 0,
    gad7Score = 0,
    attachmentType,
    personalityType,
    ksmiScore,
    emotionSummary,
    diaryStats,
    profileBrief,
    spouseData
  } = data;
  
  console.log('강화된 분석 시작:', { phq9Score, gad7Score, attachmentType, ksmiScore });
  
  // 1. 정량적 데이터 분석
  const mentalHealth = interpretMentalHealth(phq9Score, gad7Score);
  const myProfile = ATTACHMENT_PROFILES[attachmentType as keyof typeof ATTACHMENT_PROFILES] || ATTACHMENT_PROFILES.secure;
  const ksmiAnalysis = ksmiScore ? interpretKSMI(ksmiScore) : null;
  
  // 2. 커플 호환성 분석 (배우자 정보 있을 때)
  let coupleAnalysis = null;
  if (profileBrief?.myAttachment && profileBrief?.spouseAttachment) {
    coupleAnalysis = analyzeCoupleCompatibility(
      profileBrief.myAttachment, 
      profileBrief.spouseAttachment,
      personalityType,
      profileBrief.spousePersonalityType
    );
  }
  
  // 3. 감정 패턴 분석
  const emotionAnalysis = analyzeEmotionPatterns(emotionSummary, diaryStats);
  
  // 4. 주별 트렌드 분석
  const weeklyTrends = analyzeWeeklyTrends(data, previousWeeks);
  
  // 5. 종합 점수 계산 (다중 요인 반영)
  let baseScore = Math.max(0, 100 - (phq9Score * 3) - (gad7Score * 2));
  
  // KSMI 점수 반영
  if (ksmiScore) {
    baseScore = (baseScore + ksmiScore) / 2;
  }
  
  // 감정 안정성 반영
  const emotionBonus = emotionAnalysis.emotionalStability * 2;
  
  // 기록 일관성 반영
  const consistencyBonus = (diaryStats.daysActive / 7) * 10;
  
  // 트렌드 반영
  let trendBonus = 0;
  if (weeklyTrends?.emotion === 'improving') trendBonus += 5;
  if (weeklyTrends?.emotion === 'declining') trendBonus -= 5;
  
  const relationshipScore = Math.min(100, Math.max(0, baseScore + emotionBonus + consistencyBonus + trendBonus));
  
  // 6. 구체적이고 실행 가능한 권장사항 생성
  const recommendations = [
    ...mentalHealth.recommendations,
    ...myProfile.relationshipTips,
    ...emotionAnalysis.recommendations,
    ...(coupleAnalysis?.personalityCompatibility?.tips || []),
    ...(ksmiAnalysis ? [`결혼만족도 ${ksmiAnalysis.level}: ${ksmiAnalysis.advice}`] : [])
  ];
  
  // 7. AI 분석 시도 (더 풍부한 컨텍스트와 함께)
  const enhancedData = {
    ...data,
    mentalHealthContext: mentalHealth,
    attachmentProfile: myProfile,
    coupleCompatibility: coupleAnalysis,
    emotionPatterns: emotionAnalysis,
    ksmiContext: ksmiAnalysis,
    weeklyTrends,
    overallScore: relationshipScore,
    contextualPrompt: generateContextualPrompt(data, mentalHealth, myProfile, coupleAnalysis)
  };
  
  try {
    console.log('AI 분석 시도 중...');
    const aiAnalysis = await analyzeRelationshipData(enhancedData);
    
    // AI 분석과 정량적 분석 결합
    return {
      ...aiAnalysis,
      quantitativeInsights: {
        mentalHealth,
        attachmentProfile: myProfile,
        coupleCompatibility: coupleAnalysis,
        emotionPatterns: emotionAnalysis,
        ksmiAnalysis,
        weeklyTrends,
        overallScore: relationshipScore
      },
      enhancedRecommendations: generatePrioritizedRecommendations(recommendations, mentalHealth, emotionAnalysis),
      riskAlerts: generateRiskAlerts(mentalHealth, emotionAnalysis, weeklyTrends),
      progressIndicators: generateProgressIndicators(data, previousWeeks)
    };
  } catch (error) {
    console.error('AI 분석 실패, 정량적 분석 기반 폴백 사용:', error);
    
    // AI 실패시 정량적 분석 기반 폴백
    return generateEnhancedDataDrivenFallback(enhancedData);
  }
}

// 맥락적 프롬프트 생성
function generateContextualPrompt(data: any, mentalHealth: any, attachmentProfile: any, coupleAnalysis: any) {
  let prompt = `다음은 한 주간의 관계 일기 데이터 분석입니다:\n\n`;
  
  prompt += `**정신건강 상태:**\n`;
  prompt += `- 우울: ${mentalHealth.depression.level} (${mentalHealth.depression.score}점)\n`;
  prompt += `- 불안: ${mentalHealth.anxiety.level} (${mentalHealth.anxiety.score}점)\n`;
  prompt += `- 관계에 미치는 영향: ${mentalHealth.relationshipImpact}\n\n`;
  
  prompt += `**애착유형:** ${attachmentProfile.name}\n`;
  prompt += `- 강점: ${attachmentProfile.strengths.join(', ')}\n`;
  prompt += `- 주의점: ${attachmentProfile.challenges.join(', ')}\n\n`;
  
  if (coupleAnalysis) {
    prompt += `**커플 호환성:**\n`;
    prompt += `- 애착 호환성: ${coupleAnalysis.attachmentCompatibility.score}점\n`;
    prompt += `- ${coupleAnalysis.attachmentCompatibility.note}\n\n`;
  }
  
  prompt += `위 정보를 바탕으로 구체적이고 실행 가능한 관계 개선 방안을 제시해주세요.`;
  
  return prompt;
}

// 우선순위 기반 권장사항 생성
function generatePrioritizedRecommendations(recommendations: string[], mentalHealth: any, emotionAnalysis: any) {
  const prioritized: {
    urgent: { category: 'urgent'; title: string; action: string; timeline: string }[];
    important: { category: 'daily'; title: string; action: string; timeline: string }[];
    beneficial: { category: 'improvement'; title: string; action: string; timeline: string }[];
  } = {
    urgent: [],
    important: [],
    beneficial: []
  };
  
  recommendations.forEach(rec => {
    if (rec.includes('전문가') || rec.includes('⚠️')) {
      prioritized.urgent.push({
        category: 'urgent',
        title: '즉시 필요',
        action: rec,
        timeline: '즉시'
      });
    } else if (rec.includes('매일') || rec.includes('규칙적')) {
      prioritized.important.push({
        category: 'daily',
        title: '일상 습관',
        action: rec,
        timeline: '매일'
      });
    } else {
      prioritized.beneficial.push({
        category: 'improvement',
        title: '관계 개선',
        action: rec,
        timeline: '이번 주'
      });
    }
  });
  
  return prioritized;
}

// 위험 알림 생성
function generateRiskAlerts(mentalHealth: any, emotionAnalysis: any, weeklyTrends: any) {
  const alerts = [];
  
  if (mentalHealth.riskLevel === 'high') {
    alerts.push({
      level: 'critical',
      message: '높은 우울/불안 수치 감지됨',
      action: '전문가 상담을 권장합니다'
    });
  }
  
  if (emotionAnalysis.concerns.length > 2) {
    alerts.push({
      level: 'warning', 
      message: '감정 패턴에 주의가 필요합니다',
      action: '감정 조절 전략을 적용해보세요'
    });
  }
  
  if (weeklyTrends?.concerns.length > 0) {
    alerts.push({
      level: 'info',
      message: '트렌드 변화 감지됨',
      action: weeklyTrends.concerns[0]
    });
  }
  
  return alerts;
}

// 진전도 지표 생성
function generateProgressIndicators(currentData: any, previousWeeks: any[]) {
  if (!previousWeeks.length) return null;
  
  const indicators = {
    emotionalStability: 0,
    recordingConsistency: 0,
    relationshipSatisfaction: 0
  };
  
  const prevWeek = previousWeeks[0];
  if (prevWeek) {
    // 감정 안정성 변화
    const currentStability = currentData.emotionSummary.positive - currentData.emotionSummary.negative;
    const prevStability = prevWeek.emotionSummary.positive - prevWeek.emotionSummary.negative;
    indicators.emotionalStability = currentStability - prevStability;
    
    // 기록 일관성 변화
    indicators.recordingConsistency = currentData.diaryStats.daysActive - prevWeek.diaryStats.daysActive;
    
    // KSMI 변화 (있는 경우)
    if (currentData.ksmiScore && prevWeek.ksmiScore) {
      indicators.relationshipSatisfaction = currentData.ksmiScore - prevWeek.ksmiScore;
    }
  }
  
  return indicators;
}

// 데이터 기반 폴백 분석 (강화된 버전)
function generateEnhancedDataDrivenFallback(data: any) {
  const { 
    mentalHealthContext, 
    attachmentProfile, 
    coupleCompatibility, 
    emotionPatterns, 
    ksmiContext,
    weeklyTrends,
    overallScore 
  } = data;
  
  // 상황별 맞춤형 인사이트 생성
  let situationalInsight = '';
  if (mentalHealthContext.riskLevel === 'high') {
    situationalInsight = '현재 높은 스트레스 상황에서도 관계를 유지하기 위한 노력이 필요합니다. ';
  } else if (overallScore >= 80) {
    situationalInsight = '전반적으로 안정적인 관계를 유지하고 있습니다. 현재 상태를 지속하는 것이 중요합니다. ';
  } else if (overallScore < 60) {
    situationalInsight = '관계 개선이 필요한 상황입니다. 단계적 접근을 통해 관계의 질을 향상시켜보세요. ';
  }
  
  return {
    emotionalState: {
      summary: `${situationalInsight}정신건강 점수 기반: 우울 ${mentalHealthContext.depression.level}, 불안 ${mentalHealthContext.anxiety.level}`,
      trends: emotionPatterns.patterns,
      concerns: emotionPatterns.concerns.concat(
        mentalHealthContext.riskLevel === 'high' ? ['높은 위험도 - 전문가 상담 권장'] : []
      )
    },
    relationshipInsights: {
      score: overallScore,
      strengths: attachmentProfile.strengths,
      challenges: attachmentProfile.challenges,
      attachmentContext: `${attachmentProfile.name} 애착유형의 특성을 보입니다. ${coupleCompatibility?.attachmentCompatibility?.note || ''}`,
      ksmiContext: ksmiContext ? `결혼만족도: ${ksmiContext.level} (${ksmiContext.advice})` : null,
      weeklyProgress: weeklyTrends?.emotion || 'stable'
    },
    recommendations: generatePrioritizedRecommendations([
      ...attachmentProfile.relationshipTips,
      ...mentalHealthContext.recommendations,
      ...emotionPatterns.recommendations
    ], mentalHealthContext, emotionPatterns),
    quantitativeInsights: {
      mentalHealth: mentalHealthContext,
      attachmentProfile,
      coupleCompatibility,
      emotionPatterns,
      ksmiAnalysis: ksmiContext,
      weeklyTrends,
      overallScore
    },
    riskAlerts: generateRiskAlerts(mentalHealthContext, emotionPatterns, weeklyTrends),
    disclaimer: "본 분석은 표준화된 검사 도구(PHQ-9, GAD-7, KSMI)와 검증된 심리학 이론에 기반하나, 전문가 상담을 대체하지 않습니다."
  };
}