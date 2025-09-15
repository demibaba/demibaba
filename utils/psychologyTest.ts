// utils/psychologyTest.ts - Sternberg 사랑의 삼각형 이론 기반

export interface SternbergLoveType {
  type: string;
  name: string;
  intimacy: number;    // 친밀감 (0-100)
  passion: number;     // 열정 (0-100)
  commitment: number;  // 헌신 (0-100)
  description: string;
  characteristics: ReadonlyArray<string>;
  recommendations: ReadonlyArray<string>;
}

// 7가지 사랑 유형 (Sternberg, 1986)
export const STERNBERG_LOVE_TYPES = {
  consummate: {
    name: '완전한 사랑형',
    code: 'CL',
    description: '친밀감, 열정, 헌신이 모두 높은 이상적 관계',
    characteristics: ['깊은 정서적 유대감', '지속적인 로맨스', '장기적 헌신'],
    recommendations: ['현재 균형 유지가 핵심', '일상에서도 열정 유지하기', '정기적인 데이트 필수'],
  },
  companionate: {
    name: '동반자형 사랑',
    code: 'CP',
    description: '깊은 우정과 헌신은 있지만 열정은 낮은 안정적 관계',
    characteristics: ['편안하고 안정적', '서로를 깊이 이해', '가족 같은 느낌'],
    recommendations: ['의식적인 로맨스 노력 필요', '새로운 경험 함께하기', '스킨십 의도적으로 늘리기'],
  },
  romantic: {
    name: '낭만적 사랑형',
    code: 'RL',
    description: '친밀감과 열정은 높지만 헌신이 부족한 관계',
    characteristics: ['감정적으로 강렬함', '현재에 충실', '미래 계획 부족'],
    recommendations: ['장기적 목표 설정 필요', '헌신 단계적 강화', '현실적 계획 수립'],
  },
  fatuous: {
    name: '열정적 사랑형',
    code: 'FL',
    description: '열정과 헌신은 있지만 깊은 친밀감이 부족',
    characteristics: ['빠른 진행 속도', '감정 기복 있음', '깊은 대화 부족'],
    recommendations: ['서로 알아가는 시간 필요', '일상 공유 늘리기', '깊은 대화 시도'],
  },
  empty: {
    name: '형식적 사랑형',
    code: 'EL',
    description: '헌신만 남은 관계',
    characteristics: ['의무감으로 유지', '감정적 교류 없음', '습관적 관계'],
    recommendations: ['관계 재점검 필요', '전문 상담 고려', '소통 채널 재구축'],
  },
  liking: {
    name: '우정형 사랑',
    code: 'LL',
    description: '친밀감만 있는 친구 같은 관계',
    characteristics: ['편안한 친구', '로맨스 없음', '신뢰는 높음'],
    recommendations: ['로맨틱한 시도', '열정 요소 추가', '커플 활동 시작'],
  },
  infatuation: {
    name: '도취형 사랑',
    code: 'IL',
    description: '열정만 있는 관계',
    characteristics: ['첫눈에 반한 상태', '현실감 부족', '감정 중심'],
    recommendations: ['서로 알아가기', '현실적 기대치 조정', '천천히 진행'],
  },
} as const;

// 질문을 Sternberg 3요소로 재구성 (샘플 6문항, 확장 가능)
export const STERNBERG_QUESTIONS = [
  // 친밀감 5문항
  { id: 'I1', category: 'intimacy', question: '배우자와 깊은 대화를 나눕니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
  { id: 'I2', category: 'intimacy', question: '배우자가 없으면 외롭습니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
  { id: 'I3', category: 'intimacy', question: '배우자와 비밀이 없습니까?', answers: { A: { text: '항상 그렇다' }, B: { text: '대체로 그렇다' }, C: { text: '가끔 그렇다' }, D: { text: '거의 아니다' } } },
  { id: 'I4', category: 'intimacy', question: '배우자를 가장 친한 친구라고 생각합니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
  { id: 'I5', category: 'intimacy', question: '배우자와 함께 있으면 편안합니까?', answers: { A: { text: '항상 편안하다' }, B: { text: '대체로 편안하다' }, C: { text: '보통이다' }, D: { text: '편안하지 않다' } } },

  // 열정 5문항
  { id: 'P1', category: 'passion', question: '배우자를 보면 설렙니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
  { id: 'P2', category: 'passion', question: '배우자와 스킨십을 원합니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
  { id: 'P3', category: 'passion', question: '배우자를 생각하면 기분이 좋아집니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
  { id: 'P4', category: 'passion', question: '배우자에게 매력을 느낍니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
  { id: 'P5', category: 'passion', question: '배우자와 로맨틱한 시간을 원합니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },

  // 헌신 5문항
  { id: 'C1', category: 'commitment', question: '평생 함께할 확신이 있습니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
  { id: 'C2', category: 'commitment', question: '배우자를 위해 희생할 수 있습니까?', answers: { A: { text: '항상 그렇다' }, B: { text: '대체로 그렇다' }, C: { text: '가끔 그렇다' }, D: { text: '거의 아니다' } } },
  { id: 'C3', category: 'commitment', question: '어려움이 있어도 관계를 유지하겠습니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
  { id: 'C4', category: 'commitment', question: '배우자와의 미래를 계획합니까?', answers: { A: { text: '항상 한다' }, B: { text: '가끔 한다' }, C: { text: '거의 안 한다' }, D: { text: '전혀 안 한다' } } },
  { id: 'C5', category: 'commitment', question: '이 관계에 책임감을 느낍니까?', answers: { A: { text: '매우 그렇다' }, B: { text: '그렇다' }, C: { text: '보통이다' }, D: { text: '그렇지 않다' } } },
] as const;

export type SternbergAnswer = 'A' | 'B' | 'C' | 'D';
export type SternbergAnswers = Record<string, SternbergAnswer>;

// 분석 함수
export function analyzeSternbergType(answers: SternbergAnswers): SternbergLoveType {
  let intimacy = 0, passion = 0, commitment = 0;
  let intimacyCount = 0, passionCount = 0, commitmentCount = 0;

  Object.entries(answers).forEach(([questionId, answer]) => {
    const question = (STERNBERG_QUESTIONS as readonly any[] as any[]).find((q) => q.id === questionId);
    if (!question) return;

    const score = answer === 'A' ? 10 : answer === 'B' ? 7 : answer === 'C' ? 4 : 1;

    if (question.category === 'intimacy') { intimacy += score; intimacyCount++; }
    else if (question.category === 'passion') { passion += score; passionCount++; }
    else if (question.category === 'commitment') { commitment += score; commitmentCount++; }
  });

  const intimacyPct = intimacyCount > 0 ? Math.round((intimacy / (intimacyCount * 10)) * 100) : 0;
  const passionPct = passionCount > 0 ? Math.round((passion / (passionCount * 10)) * 100) : 0;
  const commitmentPct = commitmentCount > 0 ? Math.round((commitment / (commitmentCount * 10)) * 100) : 0;

  const type = determineType(intimacyPct, passionPct, commitmentPct);

  return {
    type: type.code,
    name: type.name,
    intimacy: intimacyPct,
    passion: passionPct,
    commitment: commitmentPct,
    description: type.description,
    characteristics: type.characteristics,
    recommendations: type.recommendations,
  };
}

function determineType(i: number, p: number, c: number) {
  // 70점 이상을 '높음'으로 판정
  const high = 70;
  const low = 30;

  if (i >= high && p >= high && c >= high) return STERNBERG_LOVE_TYPES.consummate;
  if (i >= high && p < low && c >= high) return STERNBERG_LOVE_TYPES.companionate;
  if (i >= high && p >= high && c < low) return STERNBERG_LOVE_TYPES.romantic;
  if (i < low && p >= high && c >= high) return STERNBERG_LOVE_TYPES.fatuous;
  if (i < low && p < low && c >= high) return STERNBERG_LOVE_TYPES.empty;
  if (i >= high && p < low && c < low) return STERNBERG_LOVE_TYPES.liking;
  if (i < low && p >= high && c < low) return STERNBERG_LOVE_TYPES.infatuation;

  return STERNBERG_LOVE_TYPES.companionate;
}