// utils/gottmanAnalysis.ts - Gottman Method 기반 관계 분석 시스템
// 클라이언트 요청사항: 과학적 근거 기반 부부 관계 분석 기능 구현
// 개발자 : 정해영  완료일: 2025.08.18
// 피드백 요청: 분석 정확도 및 한국어 패턴 매칭 개선 방안

/**
 *  핵심 기능 설명
 * 1. Gottman Method 4대 독소 자동 탐지
 * 2. 긍정/부정 5:1 비율 실시간 계산  
 * 3. 관계 위험도 3단계 평가 시스템
 * 4. 개인 맞춤형 개선 방안 자동 생성
 * 
 *  클라이언트 피드백 요청사항:
 * - 한국어 표현 패턴이 더 필요한지 검토 부탁
 * - 점수 계산 알고리즘 정확도 확인 필요
 * - 추천 메시지 톤앤매너 조정 여부
 */

export interface GottmanAnalysis {
  fourHorsemen: {
    criticism: number;     // 비판 수준 (0-100점)
    contempt: number;      // 경멸 수준 (0-100점)  
    defensiveness: number; // 방어 수준 (0-100점)
    stonewalling: number;  // 담쌓기 수준 (0-100점)
  };
  positiveRatio: number;   // 긍정/부정 비율 (목표: 5:1)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';  // 관계 위험도 3단계
  recommendations: string[];  // 맞춤 개선 방안 리스트
}

// 📋 Gottman 연구 기반 한국어 패턴 데이터베이스
// TODO: 클라이언트 피드백 받아서 패턴 추가/수정 예정
const GOTTMAN_PATTERNS = {
  // 🔴 비판(Criticism) - "너"로 시작하는 일반화 표현들
  criticism: [
    '너는 항상', '너는 절대', '왜 항상', '또 그러네',
    '맨날', '매번', '도대체 왜', '정말 답답해'
    // 💡 개발자 노트: 더 많은 패턴 추가 가능, 클라이언트 의견 필요
  ],
  
  // 🔴 경멸(Contempt) - 상대방을 깎아내리는 표현들  
  contempt: [
    '바보', '멍청', '한심', '어이없어', '말도 안돼',
    '유치해', '웃기네', '진짜', '어떻게 그럴 수 있어'
    // 💡 개발자 노트: 비속어 필터링과 경계선 검토 필요
  ],
  
  // 🔴 방어(Defensiveness) - 책임 회피 표현들
  defensiveness: [
    '내 잘못이 아냐', '나도 바빠서', '너도 그러잖아',
    '그건 다른 문제야', '변명이 아니라', '억울해'
    // 💡 개발자 노트: 정당한 해명과 방어의 구분 알고리즘 개선 필요
  ],
  
  // 🔴 담쌓기(Stonewalling) - 대화 차단 표현들
  stonewalling: [
    '말하기 싫어', '더 이상 얘기 안 해', '지쳤어',
    '그냥 두자', '나 모르겠어', '알아서 해'
    // 💡 개발자 노트: 감정적 피로와 의도적 회피 구분 로직 추가 검토
  ]
};

// 🟢 긍정적 표현 패턴 (5:1 비율 계산용)
const POSITIVE_PATTERNS = [
  '고마워', '사랑해', '좋아', '미안해', '이해해',
  '도움이 됐어', '기뻐', '행복해', '감사해', '소중해'
  // 💡 개발자 노트: 한국 부부들이 자주 쓰는 애정 표현 더 수집 필요
];

/**
 * 🔬 메인 분석 함수 - Gottman Method 기반 관계 진단
 * @param diaryText 사용자가 작성한 일기 텍스트
 * @returns GottmanAnalysis 종합 분석 결과
 * 
 * 🚀 개발자 구현 방식:
 * 1. 텍스트 전처리 (소문자 변환, 정규화)
 * 2. 패턴 매칭으로 각 독소별 점수 계산
 * 3. 긍정/부정 비율 자동 산출
 * 4. 위험도 3단계 자동 분류
 * 5. 개인 맞춤 조언 자동 생성
 */
export function analyzeGottmanFactors(diaryText: string): GottmanAnalysis {
  const text = diaryText.toLowerCase();
  
  // Step 1: 4대 독소 각각 점수 계산 (0-100점 척도)
  const criticism = calculatePatternScore(text, GOTTMAN_PATTERNS.criticism);
  const contempt = calculatePatternScore(text, GOTTMAN_PATTERNS.contempt);
  const defensiveness = calculatePatternScore(text, GOTTMAN_PATTERNS.defensiveness);
  const stonewalling = calculatePatternScore(text, GOTTMAN_PATTERNS.stonewalling);
  
  // Step 2: 긍정/부정 표현 빈도 계산
  const positiveScore = calculatePatternScore(text, POSITIVE_PATTERNS);
  const negativeScore = (criticism + contempt + defensiveness + stonewalling) / 4;
  
  // Step 3: Gottman 5:1 Magic Ratio 계산
  const positiveRatio = positiveScore > 0 ? positiveScore / Math.max(negativeScore, 1) : 0;
  
  // Step 4: 관계 위험도 3단계 자동 판정
  const avgHorsemen = (criticism + contempt + defensiveness + stonewalling) / 4;
  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 
    avgHorsemen > 60 ? 'HIGH' :    // 고위험: 즉시 전문가 상담 권장
    avgHorsemen > 30 ? 'MEDIUM' :  // 중위험: 개선 노력 필요  
    'LOW';                         // 저위험: 현 상태 유지
  
  // Step 5: 개인 맞춤형 조언 자동 생성
  const recommendations = generateGottmanRecommendations({
    criticism, contempt, defensiveness, stonewalling, positiveRatio
  });
  
  return {
    fourHorsemen: { criticism, contempt, defensiveness, stonewalling },
    positiveRatio,
    riskLevel,
    recommendations
  };
}

/**
 * 📊 패턴 매칭 점수 계산 알고리즘
 * 클라이언트 요청: 한국어 자연어 처리 정확도 향상
 * 개발자 구현: 빈도수 기반 가중치 적용 방식
 * 
 * 🔧 피드백 요청:
 * - 현재 가중치(10점)가 적절한지 검토 필요
 * - 텍스트 길이 정규화 방식 개선 방안
 */
function calculatePatternScore(text: string, patterns: string[]): number {
  let score = 0;
  const textLength = text.length;
  
  patterns.forEach(pattern => {
    const matches = (text.match(new RegExp(pattern, 'g')) || []).length;
    score += matches * 10; // 가중치: 클라이언트 피드백으로 조정 예정
  });
  
  return Math.min(100, (score / textLength) * 1000); // 0-100점 정규화
}

/**
 * 💡 개인 맞춤 조언 생성 시스템
 * Gottman Institute 공식 가이드라인 기반으로 구현
 * 
 * 🎯 클라이언트 검토 요청사항:
 * - 조언 메시지 톤앤매너가 앱 컨셉과 맞는지
 * - 더 구체적인 실천 방법 추가 필요한지  
 * - 한국 문화에 맞는 표현으로 수정 필요한지
 */
function generateGottmanRecommendations(scores: any): string[] {
  const recommendations: string[] = [];
  
  // 비판 수준이 높을 때 (40점 이상)
  if (scores.criticism > 40) {
    recommendations.push("💬 '너는 항상...' 대신 '나는 이럴 때 힘들어'로 표현해보세요");
    // TODO: 더 다양한 비판 → 건설적 표현 변환 예시 추가
  }
  
  // 경멸 표현이 감지될 때 (30점 이상)
  if (scores.contempt > 30) {
    recommendations.push("❤️ 상대방의 좋은 점을 하루에 하나씩 찾아 말해주세요");
    // TODO: 감사 표현 구체적 예시 템플릿 개발
  }
  
  // 방어적 태도가 강할 때 (40점 이상)  
  if (scores.defensiveness > 40) {
    recommendations.push("🤝 변명보다는 '내가 어떻게 도울까?'라고 물어보세요");
    // TODO: 책임감 있는 대화법 가이드 추가
  }
  
  // 대화 회피 경향이 높을 때 (40점 이상)
  if (scores.stonewalling > 40) {
    recommendations.push("⏰ 감정이 격해질 때 20분 휴식 후 다시 대화해보세요");
    // TODO: 감정 조절 기법 상세 가이드 링크
  }
  
  // 긍정 비율이 부족할 때 (3:1 미만)
  if (scores.positiveRatio < 3) {
    recommendations.push("🌟 부정적 표현 1개당 긍정적 표현 5개를 목표로 해보세요");
    // TODO: 긍정 표현 늘리기 구체적 실천법 개발
  }
  
  return recommendations;
}

// 🔚 개발 완료 - 클라이언트 피드백 대기 중
// 💌 연락처: [개발자 연락처]
// 📅 수정 일정: 피드백 접수 후 24시간 내 반영 예정