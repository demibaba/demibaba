// utils/aiAnalyzer.ts 맨 위에
import { OPENAI_CONFIG } from '../config/openaiConfig';
console.log('🔥 aiAnalyzer.ts 로드됨');
console.log('🔥 API 키 확인:', OPENAI_CONFIG.apiKey ? '있음' : '없음');

// 타입 정의
interface EmotionSummary {
  positive: number;
  negative: number;
  neutral: number;
  topEmotions: string[];
}

interface DiaryStats {
  daysActive: number;
  totalEntries: number;
  avgWordsPerEntry: number;
  keywords: string[];
}

interface ProfileBrief {
  myAttachment: string | null;
  spouseAttachment: string | null;
  myLoveLanguage: string | null;
  spouseLoveLanguage: string | null;
}

interface AnalysisData {
  phq9Score?: number;
  gad7Score?: number;
  attachmentType?: string;
  personalityType?: string;
  emotionSummary: EmotionSummary;
  diaryStats: DiaryStats;
  profileBrief: ProfileBrief;
}

interface Recommendation {
  category: 'communication' | 'selfcare' | 'together';
  title: string;
  action: string;
}

interface RelationshipAnalysis {
  emotionalState: {
    summary: string;
    trends: string[];
    concerns: string[];
  };
  relationshipInsights: {
    score: number;
    strengths: string[];
    challenges: string[];
    attachmentContext: string;
  };
  recommendations: Recommendation[];
  disclaimer: string;
}

// OpenAI API 호출 함수 (타임아웃/키 검사/상세 로그 포함)
async function callOpenAI(messages: Array<{role: string; content: string}>): Promise<RelationshipAnalysis> {
  // 0) 키 미설정 시 빠른 폴백
  if (!OPENAI_CONFIG.apiKey || OPENAI_CONFIG.apiKey.trim().length === 0) {
    console.warn('OpenAI API 키가 설정되지 않았습니다. 폴백 분석을 반환합니다.');
    return generateFallbackAnalysis();
  }

  // 1) 요청 로그 (내용은 일부만)
  console.log('OpenAI 요청 데이터:', {
    model: OPENAI_CONFIG.model,
    messages: messages.map(m => ({ role: m.role, content: (m.content || '').slice(0, 120) + '...' }))
  });

  // 2) 타임아웃 컨트롤러 (모바일 무한 로딩 방지)
  const controller = new AbortController();
  const timeoutMs = 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.model,
        messages: messages,
        response_format: { type: 'json_object' },
        max_tokens: OPENAI_CONFIG.maxTokens,
        temperature: OPENAI_CONFIG.temperature,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log('OpenAI 응답 상태:', response.status);
    if (!response.ok) {
      const errText = await response.text().catch(()=> '');
      throw new Error(`OpenAI API 오류: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    console.log('OpenAI 응답 본문(일부):', typeof content === 'string' ? content.slice(0, 200) + '...' : content);
    // 안전 파싱
    try {
      return JSON.parse(content) as RelationshipAnalysis;
    } catch (e) {
      console.warn('JSON 파싱 실패, 폴백 사용:', e);
      return generateFallbackAnalysis();
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as any)?.name === 'AbortError') {
      console.error(`OpenAI 호출 타임아웃(${timeoutMs}ms) 발생`);
    } else {
      console.error('OpenAI API 호출 실패:', error);
    }
    return generateFallbackAnalysis();
  }
}

// 시스템 프롬프트 (할루시네이션 방지)
const SYSTEM_PROMPT = `
당신은 부부관계 분석 전문가입니다.

중요한 규칙:
1. 제공된 검사 데이터와 일기 내용만을 사용하여 분석하세요
2. 추측하거나 일반론을 제시하지 마세요  
3. 오직 제공된 데이터에서 도출되는 결론만 제시하세요
4. 전문적 진단은 하지 말고, 일반적인 관찰과 제안만 하세요
5. 항상 전문가 상담을 권하는 문구를 포함하세요

응답은 반드시 다음 JSON 형식으로만 제공하세요:
{
  "emotionalState": {
    "summary": "이번 주 감정 상태 요약",
    "trends": ["패턴1", "패턴2"],
    "concerns": ["우려사항1", "우려사항2"]
  },
  "relationshipInsights": {
    "score": 1-100,
    "strengths": ["강점1", "강점2"], 
    "challenges": ["도전과제1", "도전과제2"],
    "attachmentContext": "애착유형 기반 관찰"
  },
  "recommendations": [
    {
      "category": "communication",
      "title": "소통 개선",
      "action": "구체적 행동 제안"
    },
    {
      "category": "selfcare", 
      "title": "자기돌봄",
      "action": "구체적 행동 제안"
    },
    {
      "category": "together",
      "title": "함께하기",
      "action": "구체적 행동 제안"
    }
  ],
  "disclaimer": "본 분석은 참고용이며 전문가 상담을 대체하지 않습니다."
}
`;

// 프롬프트 생성 함수
function createAnalysisPrompt(data: AnalysisData): string {
  const {
    phq9Score,
    gad7Score, 
    attachmentType,
    personalityType,
    emotionSummary,
    diaryStats,
    profileBrief
  } = data;

  // 객체를 안전하게 문자열로 변환
  const safeString = (obj: any): string => {
    if (typeof obj === 'string') return obj;
    if (obj && typeof obj === 'object') {
      try {
        if ((obj as any).type && typeof (obj as any).type === 'string') return String((obj as any).type);
        return JSON.stringify(obj);
      } catch {
        return '[object]';
      }
    }
    return String(obj ?? 'N/A');
  };

  return `
다음 데이터를 분석해주세요:

## 심리 검사 결과
- PHQ-9 우울점수: ${phq9Score || 'N/A'}점
- GAD-7 불안점수: ${gad7Score || 'N/A'}점  
- 애착유형: ${safeString(attachmentType)}
- 성격유형: ${safeString(personalityType)}

## 이번 주 감정 데이터  
- 긍정 감정: ${emotionSummary?.positive || 0}%
- 부정 감정: ${emotionSummary?.negative || 0}%
- 중립 감정: ${emotionSummary?.neutral || 0}%
- 주요 감정: ${emotionSummary?.topEmotions?.join(', ') || 'N/A'}

## 일기 작성 현황
- 작성일수: ${diaryStats?.daysActive || 0}일
- 총 기록수: ${diaryStats?.totalEntries || 0}개
- 평균 단어수: ${diaryStats?.avgWordsPerEntry || 0}개
- 주요 키워드: ${diaryStats?.keywords?.join(', ') || 'N/A'}

## 배우자 정보
- 내 애착유형: ${safeString(profileBrief?.myAttachment)}
- 배우자 애착유형: ${safeString(profileBrief?.spouseAttachment)}

위 데이터만을 바탕으로 부부관계 상태를 분석하고 JSON 형식으로 응답해주세요.
  `;
}

// Fallback 분석 (API 실패시)
function generateFallbackAnalysis(): RelationshipAnalysis {
  return {
    emotionalState: {
      summary: "이번 주 감정 데이터를 수집했습니다.",
      trends: ["감정 기록을 통한 자기인식 향상"],
      concerns: ["더 많은 데이터가 필요합니다"]
    },
    relationshipInsights: {
      score: 75,
      strengths: ["꾸준한 감정 기록", "관계 개선 의지"],
      challenges: ["지속적인 관찰 필요"],
      attachmentContext: "애착유형에 따른 맞춤 조언이 가능합니다"
    },
    recommendations: [
      {
        category: "communication",
        title: "일상 대화 늘리기", 
        action: "하루 10분 서로의 하루 이야기하기"
      },
      {
        category: "selfcare",
        title: "감정 인식하기",
        action: "감정 일기 꾸준히 작성하기"
      },
      {
        category: "together", 
        title: "함께 시간 보내기",
        action: "주 1회 함께하는 활동 정하기"
      }
    ],
    disclaimer: "본 분석은 참고용이며 전문가 상담을 대체하지 않습니다."
  };
}

// 메인 분석 함수
export async function analyzeRelationshipData(data: AnalysisData): Promise<RelationshipAnalysis> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: createAnalysisPrompt(data) }
  ];

  try {
    const analysis = await callOpenAI(messages);
    console.log('AI 분석 완료:', analysis);
    return analysis;
  } catch (error) {
    console.error('AI 분석 실패, fallback 사용:', error);
    return generateFallbackAnalysis();
  }
}

// 분석 결과를 문자열로 변환 (기존 호환성)
export function formatAnalysisAsText(analysis: RelationshipAnalysis): string {
  const lines = [
    '※ 본 분석은 참고용 정보이며 전문적인 진단이나 상담을 대체하지 않습니다.',
    '',
    '이번 주 감정 상태',
    `• ${analysis.emotionalState.summary}`,
    `• 주요 패턴: ${analysis.emotionalState.trends.join(', ')}`,
    '',
    '관계 분석',
    `• 관계 점수: ${analysis.relationshipInsights.score}점/100점`,
    `• 강점: ${analysis.relationshipInsights.strengths.join(', ')}`,
    `• 개선 영역: ${analysis.relationshipInsights.challenges.join(', ')}`,
    `• ${analysis.relationshipInsights.attachmentContext}`,
    '',
    '추천 행동',
    ...analysis.recommendations.map(rec => `• ${rec.title}: ${rec.action}`),
    '',
    analysis.disclaimer,
  ];
  
  return lines.filter(Boolean).join('\n');
}


