// utils/emotionReliability.ts - 감정 데이터 신뢰도 계산
import { Timestamp } from 'firebase/firestore';

export interface DiaryData {
  date: string;
  emotions: string[];
  text: string;
  createdAt: Timestamp;
}

export interface EmotionReliability {
  score: number; // 0-10 점수
  level: 'low' | 'medium' | 'high'; // 신뢰도 수준
  dataPoints: number; // 기록된 날 수
  quality: 'poor' | 'fair' | 'good'; // 데이터 품질
  warning: string; // 경고 메시지
  meaning: string; // 점수 의미
  trend: 'up' | 'down' | 'stable'; // 트렌드
  advice: string[]; // 개선 조언
}

export function calculateEmotionReliability(
  currentWeekData: DiaryData[],
  previousWeeksData: DiaryData[][],
  emotionType: string
): EmotionReliability {
  
  // 1. 기본 데이터 수집
  const dataPoints = currentWeekData.length;
  const totalPossibleDays = 7;
  const completeness = dataPoints / totalPossibleDays;
  
  // 2. 데이터 품질 평가
  const avgTextLength = currentWeekData.reduce((sum, diary) => 
    sum + diary.text.length, 0) / dataPoints;
  
  const emotionVariety = new Set(
    currentWeekData.flatMap(diary => diary.emotions)
  ).size;
  
  // 3. 감정 점수 계산 (0-10)
  const emotionCounts = currentWeekData.reduce((counts, diary) => {
    diary.emotions.forEach(emotion => {
      counts[emotion] = (counts[emotion] || 0) + 1;
    });
    return counts;
  }, {} as Record<string, number>);
  
  const currentScore = Math.min(
    ((emotionCounts[emotionType] || 0) / dataPoints) * 10, 
    10
  );
  
  // 4. 과거 데이터와 비교
  const previousScores = previousWeeksData.map(weekData => {
    const prevCounts = weekData.reduce((counts, diary) => {
      diary.emotions.forEach(emotion => {
        counts[emotion] = (counts[emotion] || 0) + 1;
      });
      return counts;
    }, {} as Record<string, number>);
    
    return weekData.length > 0 ? 
      Math.min(((prevCounts[emotionType] || 0) / weekData.length) * 10, 10) : 0;
  });
  
  const avgPreviousScore = previousScores.length > 0 ? 
    previousScores.reduce((sum, score) => sum + score, 0) / previousScores.length : 5;
  
  // 5. 트렌드 분석
  const trend: 'up' | 'down' | 'stable' = 
    currentScore > avgPreviousScore + 0.5 ? 'up' :
    currentScore < avgPreviousScore - 0.5 ? 'down' : 'stable';
  
  // 6. 신뢰도 수준 결정
  let reliabilityLevel: 'low' | 'medium' | 'high';
  let warning: string;
  
  if (dataPoints < 3) {
    reliabilityLevel = 'low';
    warning = `📝 더 많은 기록이 필요해요 (${dataPoints}/7일)`;
  } else if (dataPoints < 5 || avgTextLength < 50) {
    reliabilityLevel = 'medium';
    warning = `💭 더 자세한 감정 표현이 도움돼요`;
  } else {
    reliabilityLevel = 'high';
    warning = `✅ 신뢰할 만한 분석이에요`;
  }
  
  // 7. 데이터 품질 평가
  const quality: 'poor' | 'fair' | 'good' = 
    emotionVariety < 2 ? 'poor' :
    emotionVariety < 4 ? 'fair' : 'good';
  
  // 8. 점수 의미 설명
  const meaning = currentScore >= 7 ? '높은 편' :
                  currentScore >= 4 ? '보통 수준' : '낮은 편';
  
  // 9. 개선 조언
  const advice: string[] = [];
  
  if (dataPoints < 5) {
    advice.push("일주일에 5일 이상 기록하기");
  }
  if (avgTextLength < 100) {
    advice.push("감정을 더 구체적으로 표현하기");
  }
  if (emotionVariety < 3) {
    advice.push("좋은 날, 나쁜 날 골고루 기록하기");
  }
  
  if (trend === 'down' && emotionType === 'happiness') {
    advice.push("행복한 순간을 의식적으로 기록해보기");
  }
  
  if (trend === 'up' && emotionType === 'anxiety') {
    advice.push("스트레스 관리법 찾아보기");
  }
  
  return {
    score: Math.round(currentScore * 10) / 10,
    level: reliabilityLevel,
    dataPoints,
    quality,
    warning,
    meaning,
    trend,
    advice
  };
}

// 감정 타입별 색상 및 이모지
export const EMOTION_CONFIG = {
  happiness: { emoji: '😊', color: '#FFF3E0', name: '행복도' },
  love: { emoji: '❤️', color: '#FCE4EC', name: '사랑' },
  sadness: { emoji: '😢', color: '#E3F2FD', name: '슬픔' },
  anger: { emoji: '😠', color: '#FFEBEE', name: '분노' },
  anxiety: { emoji: '😰', color: '#F3E5F5', name: '불안도' },
  surprise: { emoji: '😲', color: '#E8F5E8', name: '놀람' }
};