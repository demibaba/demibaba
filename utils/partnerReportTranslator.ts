// utils/partnerReportTranslator.ts - 완전 무료 파트너 레포트 번역기
export interface PartnerReportData {
  emotions: string[];
  attachmentType: string;
  personalityType?: string;
  weeklyPattern?: string;
}

// 감정 번역 딕셔너리 (부담스럽지 않게)
const EMOTION_TRANSLATION = {
  '외로움': '더 많은 함께 시간을 원해요',
  '불안': '안정감이 필요한 상태예요',
  '스트레스': '에너지 충전이 필요해요',
  '화남': '이해받고 싶어해요',
  '짜증': '컨디션 조절이 필요해요',
  '우울': '마음이 무거운 상태예요',
  '행복': '정말 기분 좋은 상태예요',
  '사랑': '당신에 대한 애정이 깊어요',
  '감사': '고마운 마음이 가득해요',
  '평온': '마음이 안정된 상태예요'
};

// 애착유형별 맞춤 조언
const ATTACHMENT_ADVICE = {
  '안정형': {
    '외로움': ['10분 대화 시간 갖기', '스마트폰 내려놓고 집중해주기', '함께 산책하며 이야기하기'],
    '스트레스': ['실질적 도움 제공', '집안일 분담하기', '마사지 해주기'],
    '불안': ['안아주기', '"괜찮을 거야" 안심시키기', '함께 있어주기'],
    '행복': ['기쁨 함께 나누기', '축하해주기', '좋은 순간 기록하기']
  },
  '불안형': {
    '외로움': ['자주 안아주기', '"사랑해" 말로 표현하기', '예측가능한 관심 보이기'],
    '스트레스': ['걱정 들어주기', '"내가 있어" 안심시키기', '자주 연락하기'],
    '불안': ['즉시 반응해주기', '확신 주는 말하기', '일관된 애정 표현'],
    '행복': ['함께 기뻐하기', '칭찬 많이 하기', '애정 표현 늘리기']
  },
  '회피형': {
    '외로움': ['물리적 접촉보다 실질적 도움', '강요하지 않고 기다려주기', '개인 공간 존중하기'],
    '스트레스': ['혼자만의 시간 배려', '압박 주지 않기', '실용적 해결책 제시'],
    '불안': ['차분하게 대화하기', '논리적 접근하기', '시간 여유 주기'],
    '행복': ['조용히 함께 있어주기', '과도한 표현 피하기', '안정감 제공']
  }
};

// 실행 가능한 행동 제안
const ACTIONABLE_STEPS = {
  '외로움': [
    '오늘: "고생했어" 한마디 + 어깨 토닥이기',
    '내일: 30분 함께 TV 보며 대화하기',
    '이번 주: 좋아하는 카페에서 데이트하기'
  ],
  '스트레스': [
    '오늘: 좋아하는 간식 사다주기',
    '내일: 집안일 하나 대신 해주기',
    '이번 주: 마사지 쿠폰 선물하기'
  ],
  '행복': [
    '오늘: "행복해 보여서 나도 좋아" 말하기',
    '내일: 좋은 순간 사진 찍어주기',
    '이번 주: 특별한 추억 만들기'
  ]
};

export const translateToPartnerReport = (data: PartnerReportData): string => {
  const { emotions, attachmentType } = data;

  // 감정 번역
  const translatedEmotions = emotions.map(emotion =>
    EMOTION_TRANSLATION[emotion as keyof typeof EMOTION_TRANSLATION] || emotion
  );

  // 주요 감정 선택 (최대 3개) - advice와 actions에서 사용됨
  const primaryEmotions = emotions.slice(0, 3) as Array<keyof typeof ATTACHMENT_ADVICE[keyof typeof ATTACHMENT_ADVICE]>;

  // 조언 생성
  const advice = primaryEmotions.map(emotion =>
    ATTACHMENT_ADVICE[attachmentType as keyof typeof ATTACHMENT_ADVICE]?.[emotion] || ['따뜻한 관심 보여주기']
  ).flat().slice(0, 3);

  // 실행 가능한 행동
  const actions = primaryEmotions.map(emotion =>
    ACTIONABLE_STEPS[emotion as keyof typeof ACTIONABLE_STEPS] || ['함께 시간 보내기']
  ).flat().slice(0, 3);

  return `🏥 파트너 마음 리포트

📊 이번 주 주요 감정 상태
${translatedEmotions.map(emotion => `💭 ${emotion}`).join('\n')}

🎯 ${attachmentType} 파트너에게 지금 가장 도움이 되는 것
${advice.map((item, index) => `${index + 1}. ${item}`).join('\n')}

💝 작은 행동, 큰 변화
${actions.map(action => `✅ ${action}`).join('\n')}

---
💡 더 구체적인 감정 내용은 개인 프라이버시로 보호됩니다.`;
};
