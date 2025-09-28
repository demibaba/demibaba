// utils/timeHeat.ts
import { DiaryEntry } from '../types/diary';

export interface WeekPatternResult {
  topDay?: string | null;
  topHour?: string | null;
  topKeywords?: string[];
}

// KST 기준 요일/시간/키워드 상위 값을 계산
export function getWeekPattern(entries: DiaryEntry[] = []): WeekPatternResult {
  if (!entries || entries.length === 0) return {};

  const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const hourCount: Record<number, number> = {};
  const keywordCount: Record<string, number> = {};

  for (const e of entries) {
    // 시간 정보: timestampUtc가 있으면 사용, 없으면 date를 자정 기준으로 처리
    const base = e.timestampUtc ? new Date(e.timestampUtc) : new Date(`${e.date}T00:00:00Z`);
    // UTC -> KST(+9h)
    const kstTime = new Date(base.getTime() + 9 * 60 * 60 * 1000);

    const dayIdx = kstTime.getUTCDay();
    const hour = kstTime.getUTCHours();

    dayCount[dayIdx] = (dayCount[dayIdx] ?? 0) + 1;
    hourCount[hour] = (hourCount[hour] ?? 0) + 1;

    // 키워드: tags 우선, 없으면 text에서 간단 추출
    const tags = Array.isArray(e.tags) ? e.tags : [];
    for (const t of tags) {
      const key = String(t).trim();
      if (!key) continue;
      keywordCount[key] = (keywordCount[key] ?? 0) + 1;
    }

    if ((!tags || tags.length === 0) && e.text) {
      const words = extractKeywordsFromText(e.text);
      for (const w of words) {
        keywordCount[w] = (keywordCount[w] ?? 0) + 1;
      }
    }
  }

  const topDayIdx = getTopKey(dayCount);
  const topHourNum = getTopKey(hourCount);

  const topKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  return {
    topDay: topDayIdx !== null ? weekdayNames[topDayIdx] : null,
    topHour: topHourNum !== null ? `${topHourNum}시` : null,
    topKeywords: topKeywords.length ? topKeywords : undefined,
  };
}

function getTopKey(counts: Record<number, number>): number | null {
  let bestKey: number | null = null;
  let bestVal = -1;
  for (const [k, v] of Object.entries(counts)) {
    const keyNum = Number(k);
    if (v > bestVal) {
      bestVal = v;
      bestKey = keyNum;
    }
  }
  return bestVal > 0 ? bestKey : null;
}

function extractKeywordsFromText(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    // 비문자/비숫자 제거 (한글/영문/숫자/공백만 유지)
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const stopwords = new Set([
    // 아주 간단한 불용어 (ko/en 혼합)
    '그리고', '그러나', '하지만', '그래서', '그런데', '또한', '정말', '진짜', '너무', '매우',
    'the', 'and', 'or', 'but', 'so', 'very', 'really', 'just', 'with', 'without', 'to', 'of', 'in', 'on', 'for',
  ]);

  const tokens = cleaned.split(' ')
    .map(w => w.trim())
    .filter(w => w && w.length >= 2 && !stopwords.has(w))
    .slice(0, 50); // 안전상 너무 길게 처리하지 않음

  return tokens;
}


