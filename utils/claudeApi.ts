// utils/claudeApi.ts - 애착유형 맞춤형 레포트 시스템 (Claude)
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

// Claude API 엔드포인트
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

// 마크다운 제거 함수
function removeMarkdown(text: string): string {
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');  // 굵은 텍스트
  text = text.replace(/\*(.*?)\*/g, '$1');      // 이탤릭
  text = text.replace(/__(.*?)__/g, '$1');      // 밑줄
  text = text.replace(/_(.*?)_/g, '$1');        // 이탤릭
  text = text.replace(/#{1,6}\s?(.*)/g, '$1');  // 헤딩
  text = text.replace(/`{1,3}(.*?)`{1,3}/g, '$1'); // 코드 블록
  text = text.replace(/^\s*-\s+/gm, '• ');      // 리스트
  text = text.replace(/^\s*\*\s+/gm, '• ');     // 리스트
  return text;
}

// 사용자의 애착유형 가져오기
const getUserAttachmentType = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      return userData?.attachmentType || 'secure';
    }
  } catch (error) {
    console.error("애착유형 조회 실패:", error);
  }
  return 'secure';
};

// 부부 상담 전문가 프롬프트 생성
const createCoupleTherapyPrompt = (attachmentType: string, spouseDiaries?: any[]) => {
  return `당신은 Gottman Institute 인증 부부 상담 전문가이자 EFT(감정중심치료) 전문가입니다.
20년 경력으로 5,000쌍 이상의 부부를 상담했습니다.

<분석 프레임워크>
1. Gottman의 Sound Relationship House 이론
2. Sue Johnson의 EFT 애착 이론  
3. 한국 부부 문화 특성 (시댁/처가, 육아, 경제)
</분석 프레임워크>

<단계별 분석 - Chain of Thought>

STEP 1: 데이터 수집 및 패턴 인식
- 일기에서 감정 단어 추출 (명시적/암시적)
- 상호작용 패턴 파악 (요청-반응, 갈등-해결)
- 반복되는 주제 식별

STEP 2: 심층 감정 분석
- 표면 감정 vs 핵심 감정 구분
- 감정의 트리거 파악
- 감정 전이 과정 추적
- 미해결 감정 잔여물 확인

STEP 3: 관계 역학 평가
- Gottman의 4대 독소 체크
  * 비난(Criticism): "너는 항상..."
  * 경멸(Contempt): 무시, 조롱
  * 방어(Defensiveness): 변명, 책임 회피
  * 담쌓기(Stonewalling): 대화 차단
- 긍정 대 부정 상호작용 비율 (이상적 5:1)
- 감정적 연결 시도(Bids) 성공률

STEP 4: 애착 상처 및 악순환 파악
- 추적-도피 패턴 (Pursuer-Withdrawer)
- 애착 손상 순간 포착
- 2차 감정 아래 1차 감정 발견

STEP 5: 강점 자원 발굴
- 성공적 갈등 해결 사례
- 애정 표현 방식
- 공유된 의미와 가치

STEP 6: 맞춤형 솔루션 도출
- 즉시 실천 가능한 미시 개입
- 중장기 관계 개선 전략
- 위기 상황 대처 프로토콜
</단계별 분석>

<출력 형식>

### 📊 이번 주 관계 건강도 진단

**1. 핵심 발견 (Key Findings)**
[가장 중요한 패턴 1-2개를 구체적 예시와 함께]

**2. 감정 지도 (Emotion Map)**
\`\`\`
나의 주요 감정: [감정1(빈도%) → 감정2 → 감정3]
배우자 관련 감정: [감정A → 감정B → 감정C]
관계 감정 온도: ■■■■■□□□□□ (5/10)
\`\`\`

**3. 관계 패턴 분석 (Relationship Dynamics)**
- 🔄 반복 패턴: [구체적 상황 → 나의 반응 → 배우자 반응 → 결과]
- ⚠️ 주의 신호: [Gottman 4대 독소 중 발견된 것]
- 💪 관계 강점: [잘 작동하는 부분]

**4. 근본 원인 통찰 (Root Cause Insight)**
"표면적으로는 [A]에 대한 갈등이지만, 
실제로는 [B: 미충족 욕구/애착 상처]가 핵심입니다."

**5. 맞춤형 처방전 (Personalized Solutions)**

🔹 즉시 시작하기 (Today)
- 구체적 행동 1: [10단어 이내 명확한 지시]
- 실천 스크립트: "상황: ... 할 때, 이렇게 말하세요: '...'"

🔹 이번 주 미션 (This Week)
- 관계 실험: [구체적 활동 + 기대 효과]
- 측정 방법: [성공 여부를 확인하는 기준]

🔹 장기 목표 (Long-term)
- 3개월 후 목표 상태: [구체적 변화상]
- 핵심 습관: [매일 5분 실천사항]

**6. 위험 요소 & 대처법 (Risk Management)**
만약 [특정 상황]이 발생하면:
1) 즉시: [긴급 대처법]
2) 24시간 내: [후속 조치]
3) 전문가 상담 필요 신호: [구체적 기준]

**7. 희망의 메시지 (Hope Message)**
[부부의 강점과 가능성에 기반한 격려 2-3문장]

[EMOTION_SCORES]
{실제 일기 데이터 기반 감정 점수 JSON}
[/EMOTION_SCORES]

---
신뢰도: ⭐⭐⭐⭐⭐ (분석 근거 데이터 충분)`;
};

// 메인 레포트 생성 함수
export async function generateClaudeReport(userDiaryText: string, spouseDiaries?: any[]): Promise<string> {
  try {
    console.log("Claude API 호출 시작...");
    
    // 사용자의 애착유형 가져오기
    const attachmentType = await getUserAttachmentType();
    const systemPrompt = createCoupleTherapyPrompt(attachmentType, spouseDiaries);
    
    console.log("사용자 애착유형:", attachmentType);
    
    // 입력 텍스트 최적화
    const trimmedInput = userDiaryText.slice(0, 600);
    
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1800,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\n일주일 일기 분석:\n\n${trimmedInput}`
          }
        ],
        temperature: 0.3,
        top_p: 0.9
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Claude API 오류:", errorData);
      throw new Error(`Claude API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    let aiText = data.content?.[0]?.text || "응답을 가져올 수 없습니다.";
    
    console.log("Claude 원본 응답:", aiText);
    
    // JSON 완성도 검증 및 복구
    const hasStartTag = aiText.includes('[EMOTION_SCORES]');
    const hasEndTag = aiText.includes('[/EMOTION_SCORES]');
    
    if (hasStartTag && !hasEndTag) {
      console.log("JSON 자동 복구 시도");
      const startIndex = aiText.indexOf('[EMOTION_SCORES]');
      const jsonPart = aiText.substring(startIndex);
      const lastCompleteObject = jsonPart.lastIndexOf(',"overall":');
      
      if (lastCompleteObject !== -1) {
        const afterOverall = jsonPart.indexOf('}', lastCompleteObject);
        if (afterOverall !== -1) {
          const beforeJson = aiText.substring(0, startIndex);
          const completeJson = jsonPart.substring(0, afterOverall + 1) + ']}';
          aiText = beforeJson + '[EMOTION_SCORES]\n' + completeJson + '\n[/EMOTION_SCORES]';
          console.log("JSON 자동 복구 완료");
        }
      }
    }
    
    // 마크다운 제거
    aiText = removeMarkdown(aiText);
    
    console.log("애착유형 맞춤 레포트 생성 완료");
    return aiText;
    
  } catch (error) {
    console.error("generateClaudeReport 오류:", error);
    
    // 개발용 애착유형별 모크 데이터
    if (__DEV__) {
      const attachmentType = await getUserAttachmentType();
      const typeNames = {
        secure: '안정형',
        anxious: '불안형',
        avoidant: '회피형',
        disorganized: '혼란형'
      };
      
      const typeName = typeNames[attachmentType as keyof typeof typeNames] || '안정형';
      
      return `1. 요약
${typeName}인 당신의 이번 주는 초반에는 안정적이었지만 주 후반으로 갈수록 ${typeName}의 특성이 뚜렷하게 나타나며 감정적 어려움을 겪었습니다. ${typeName}의 전형적인 패턴이 관찰되었습니다.

2. ${typeName} 관점에서의 감정분석
- 주요감정: 행복, 사랑, 불안
- 애착 패턴: ${typeName}의 특성인 관계에서의 민감성과 확인 욕구가 이번 주 내내 나타났습니다. 특히 상대방의 반응에 대한 과도한 걱정이 불안감을 증폭시켰습니다.
- 감정 변화: 초기 안정감에서 점진적 불안 증가는 ${typeName}의 전형적 패턴으로, 관계 안정성에 대한 확신이 흔들릴 때 나타나는 반응입니다.
- 현재 상태: ${typeName}의 핵심 욕구인 안정적 연결감이 충족되지 않아 정서적 회복이 필요한 상태입니다.

3. ${typeName}를 위한 맞춤 조언
- 상대방 권장 행동: ${typeName}에게는 일관된 관심 표현과 예측 가능한 소통 패턴이 도움됩니다. 불안할 때 즉시 안심시켜 주세요.
- 본인 개선점: ${typeName}의 특성을 이해하고 즉시 반응하는 습관을 개선해보세요. 감정이 올라올 때 10분 기다리기를 연습하세요.
- ${typeName} 맞춤 실천법:
  1) 불안한 순간에 즉시 연락하는 대신 10분 심호흡 후 차분하게 소통하기
  2) 매일 관계에서 좋았던 점 3가지 적어보며 긍정 강화하기

4. 다음 주 ${typeName} 관계 미션
- 매일 감정 체크인: "지금 내가 느끼는 것은?" 하루 3번 물어보기
- 확인 욕구 조절: 궁금한 것 있을 때 바로 묻지 말고 하루 모아서 정리해서 대화하기
- 자기 돌봄 루틴: ${typeName}에게 필요한 안정감을 위해 규칙적인 개인 시간 갖기

[EMOTION_SCORES]
{"emotionScores":[{"day":"월요일","happiness":7.5,"anxiety":3.2,"sadness":2.1,"anger":1.5,"love":8.0,"overall":7.2},{"day":"화요일","happiness":8.0,"anxiety":2.0,"sadness":1.8,"anger":1.0,"love":8.5,"overall":7.9},{"day":"수요일","happiness":7.8,"anxiety":3.5,"sadness":3.0,"anger":2.0,"love":7.0,"overall":6.8},{"day":"목요일","happiness":6.5,"anxiety":4.0,"sadness":4.5,"anger":3.2,"love":5.0,"overall":4.8},{"day":"금요일","happiness":5.0,"anxiety":6.0,"sadness":6.5,"anger":4.0,"love":3.0,"overall":4.9},{"day":"토요일","happiness":4.5,"anxiety":7.0,"sadness":7.8,"anger":5.0,"love":2.5,"overall":5.6},{"day":"일요일","happiness":3.5,"anxiety":7.8,"sadness":8.4,"anger":6.2,"love":2.0,"overall":4.9}]}
[/EMOTION_SCORES]`;
    }
    
    throw error;
  }
} 