// utils/loveLanguages.ts - 애정 표현 방식 (Gary Chapman)
export interface LoveLanguage {
    primary: 'words' | 'time' | 'gifts' | 'service' | 'touch';
    secondary: string;
    matchScore: number; // 배우자와 일치도
    recommendations: string[];
  }
  
  const LOVE_PATTERNS = {
    words: ['사랑해', '고마워', '칭찬', '격려'],
    time: ['함께', '같이', '시간', '데이트'],
    gifts: ['선물', '깜짝', '사줬', '받았'],
    service: ['도와줬', '해줬', '챙겨줬', '배려'],
    touch: ['안아줬', '손잡고', '스킨십', '포옹']
  };
  
  export function analyzeLoveLanguage(text: string): LoveLanguage {
    const scores = Object.entries(LOVE_PATTERNS).map(([lang, patterns]) => ({
      language: lang,
      score: patterns.filter(p => text.includes(p)).length
    }));
    
    scores.sort((a, b) => b.score - a.score);
    if (!scores.length) {
      return {
        primary: 'words',
        secondary: 'time',
        matchScore: 0,
        recommendations: generateLoveRecommendations('words')
      };
    }

    const primary = scores[0]?.language || 'words';
    const secondary = scores[1]?.language || 'time';

    return {
      primary: primary as LoveLanguage['primary'],
      secondary: secondary,
      matchScore: 70, // 배우자 데이터와 비교 필요 
      recommendations: generateLoveRecommendations(primary)
    };
  }
  
  function generateLoveRecommendations(language: string): string[] {
    const recs: Record<string, string[]> = {
      words: ['하루 3번 사랑 표현하기', '감사 일기 공유'],
      time: ['주 1회 데이트 시간', '저녁 30분 대화'],
      gifts: ['작은 선물 준비', '기념일 캘린더'],
      service: ['집안일 분담표', '서로 도움 요청하기'],
      touch: ['아침 포옹 루틴', '손잡고 산책']
    };
    return recs[language] || [];
  }