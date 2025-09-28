// utils/aiAnalyzer.ts
import { OPENAI_CONFIG } from '../config/openaiConfig';

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

// 개선된 시스템 프롬프트 (짧은 일기에서도 구체적 분석)
const ENHANCED_SYSTEM_PROMPT = `
당신은 부부관계 분석 전문가입니다.

분석 원칙:
1. 짧은 일기라도 구체적인 행동과 감정에 주목하세요
2. 패턴을 찾아 실행 가능한 조언을 제시하세요  
3. "산책", "커피", "마사지" 같은 구체적 활동을 강조하세요
4. 부족한 정보는 "더 자세한 기록이 필요"라고 명시하세요
5. 전문적 진단은 하지 말고, 일반적인 관찰과 제안만 하세요

응답은 반드시 다음 JSON 형식으로만 제공하세요:
{
  "emotionalState": {
    "summary": "구체적 활동 기반 감정 분석",
    "trends": ["관찰된 구체적 패턴들"],
    "concerns": ["부족한 데이터나 우려사항"]
  },
  "relationshipInsights": {
    "score": 70-90,
    "strengths": ["함께한 구체적 활동들", "긍정적 상호작용"],
    "challenges": ["개선이 필요한 영역"],
    "attachmentContext": "애착유형 기반 맞춤 관찰"
  },
  "recommendations": [
    {
      "category": "communication",
      "title": "소통 개선",
      "action": "실제 일기 내용을 반영한 구체적 제안"
    },
    {
      "category": "selfcare", 
      "title": "자기돌봄",
      "action": "개인적 웰빙을 위한 구체적 행동"
    },
    {
      "category": "together",
      "title": "함께하기",
      "action": "효과가 입증된 활동을 더 자주 하기"
    }
  ],
  "disclaimer": "본 분석은 참고용이며 전문가 상담을 대체하지 않습니다."
}
`;

// 안전한 객체-문자열 변환 함수
function safeObjectToString(obj: any): string {
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (obj === null || obj === undefined) return 'N/A';
  
  // 애착유형 객체 처리
  if (obj && typeof obj === 'object') {
    if (obj.type) {
      const confidence = obj.confidence ? ` (신뢰도: ${obj.confidence}%)` : '';
      return `${obj.type}형${confidence}`;
    }
    
    // 러브랭귀지 객체 처리
    if (obj.primary) {
      return `${obj.primary}${obj.secondary ? `, ${obj.secondary}` : ''}`;
    }
    
    // 일반 객체는 JSON 문자열로
    try {
      return JSON.stringify(obj);
    } catch {
      return '[복합 객체]';
    }
  }
  
  return String(obj);
}

// 개선된 프롬프트 생성 함수
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

  return `
다음 데이터를 분석해주세요:

## 심리 검사 결과
- PHQ-9 우울점수: ${phq9Score || 'N/A'}점
- GAD-7 불안점수: ${gad7Score || 'N/A'}점  
- 애착유형: ${safeObjectToString(attachmentType)}
- 성격유형: ${safeObjectToString(personalityType)}

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

## 관계 정보
- 내 애착유형: ${safeObjectToString(profileBrief?.myAttachment)}
- 배우자 애착유형: ${safeObjectToString(profileBrief?.spouseAttachment)}
- 내 러브랭귀지: ${safeObjectToString(profileBrief?.myLoveLanguage)}
- 배우자 러브랭귀지: ${safeObjectToString(profileBrief?.spouseLoveLanguage)}

분석 지침:
- 키워드에서 구체적 활동들을 주목하세요 (예: "산책", "마사지", "커피")
- 짧은 기록이라도 의미있는 패턴을 찾아보세요
- 실제로 효과가 있었던 활동들을 더 자주 하도록 권장하세요
- 데이터가 부족한 부분은 솔직히 언급하세요

위 데이터만을 바탕으로 부부관계 상태를 분석하고 JSON 형식으로 응답해주세요.
  `;
}

// 개선된 Fallback 분석 (실제 데이터 활용)
function generateFallbackAnalysis(data?: AnalysisData): RelationshipAnalysis {
  const emotions = data?.emotionSummary;
  const stats = data?.diaryStats;
  const keywords = stats?.keywords || [];
  
  // 실제 데이터 기반 분석
  const hasPositiveKeywords = keywords.some(k => 
    ['산책', '커피', '마사지', '박물관', '함께', '좋다', '고마'].some(pos => k.includes(pos))
  );
  
  const analysisQuality = (stats?.avgWordsPerEntry || 0) > 10 ? '충분함' : '부족함';
  
  return {
    emotionalState: {
      summary: emotions ? 
        `이번 주 감정 상태는 긍정 ${emotions.positive}%, 부정 ${emotions.negative}%로 나타났습니다.` :
        "이번 주 감정 데이터를 수집했습니다.",
      trends: keywords.length > 0 ? 
        [`주요 활동: ${keywords.slice(0, 3).join(', ')}`, "감정 기록을 통한 자기인식 향상"] :
        ["감정 기록을 통한 자기인식 향상"],
      concerns: analysisQuality === '부족함' ? 
        ["더 자세한 기록이 필요합니다", "일기 내용이 짧아 깊이 있는 분석이 어렵습니다"] :
        ["지속적인 관찰이 필요합니다"]
    },
    relationshipInsights: {
      score: hasPositiveKeywords ? 85 : 75,
      strengths: hasPositiveKeywords ? 
        ["함께하는 활동들", "꾸준한 감정 기록", "관계 개선 의지"] :
        ["꾸준한 감정 기록", "관계 개선 의지"],
      challenges: analysisQuality === '부족함' ? 
        ["더 구체적인 감정 표현 필요", "일상의 작은 순간들 기록하기"] :
        ["지속적인 관찰 필요"],
      attachmentContext: data?.profileBrief?.myAttachment ? 
        `${safeObjectToString(data.profileBrief.myAttachment)} 특성을 고려한 맞춤 조언이 가능합니다` :
        "애착유형에 따른 맞춤 조언이 가능합니다"
    },
    recommendations: [
      {
        category: "communication",
        title: hasPositiveKeywords ? "효과적인 활동 늘리기" : "일상 대화 늘리기", 
        action: hasPositiveKeywords ? 
          `${keywords.find(k => ['산책', '커피', '마사지'].some(act => k.includes(act))) || '함께하는 활동'}을 더 자주 해보세요` :
          "하루 10분 서로의 하루 이야기하기"
      },
      {
        category: "selfcare",
        title: "감정 인식하기",
        action: analysisQuality === '부족함' ? 
          "감정과 함께 그 이유도 간단히 기록해보세요" :
          "감정 일기 꾸준히 작성하기"
      },
      {
        category: "together", 
        title: "함께 시간 보내기",
        action: hasPositiveKeywords ?
          "이번 주처럼 함께하는 활동을 계속 유지해보세요" :
          "주 1회 함께하는 활동 정하기"
      }
    ],
    disclaimer: "본 분석은 참고용이며 전문가 상담을 대체하지 않습니다."
  };
}

// 메인 분석 함수
export async function analyzeRelationshipData(data: AnalysisData): Promise<RelationshipAnalysis> {
  const messages = [
    { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
    { role: 'user', content: createAnalysisPrompt(data) }
  ];

  try {
    const analysis = await callOpenAI(messages);
    console.log('AI 분석 완료:', analysis);
    return analysis;
  } catch (error) {
    console.error('AI 분석 실패, fallback 사용:', error);
    return generateFallbackAnalysis(data);
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


