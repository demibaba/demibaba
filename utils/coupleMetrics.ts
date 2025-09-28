// utils/coupleMetrics.ts
import type { DiaryEntry, Emotion } from '../types/diary';

const EMOTION_VALENCE: Record<Emotion, number> = {
  terrible: -2,
  bad: -1,
  neutral: 0,
  good: 1,
  great: 2,
};

function groupByDate(entries: DiaryEntry[]): Record<string, DiaryEntry[]> {
  const map: Record<string, DiaryEntry[]> = {};
  for (const e of entries) {
    const day = (e.timestampUtc || '').slice(0, 10);
    if (!day) continue;
    if (!map[day]) map[day] = [];
    map[day].push(e);
  }
  return map;
}

function pickLastByTime(entries: DiaryEntry[]): DiaryEntry | null {
  if (!entries.length) return null;
  return entries
    .slice()
    .sort((a, b) => (a.timestampUtc < b.timestampUtc ? -1 : 1))
    .at(-1) as DiaryEntry;
}

export function calculateSynchrony(my: DiaryEntry[], spouse: DiaryEntry[]) {
  const myByDate = groupByDate(my);
  const spByDate = groupByDate(spouse);
  const days = Array.from(new Set([...Object.keys(myByDate), ...Object.keys(spByDate)])).sort();
  let numerator = 0;
  let denom = 0;
  const samples: Array<{ date: string; my?: Emotion; spouse?: Emotion; diff?: number }> = [];

  for (const d of days) {
    const m = pickLastByTime(myByDate[d] || []);
    const s = pickLastByTime(spByDate[d] || []);
    if (!m || !s) continue;
    denom++;
    const diff = Math.abs(EMOTION_VALENCE[m.emotion] - EMOTION_VALENCE[s.emotion]);
    if (diff <= 1) numerator++;
    samples.push({ date: d, my: m.emotion, spouse: s.emotion, diff });
  }

  const value = denom ? Math.round((numerator / denom) * 100) : 0;
  return { value, samples, window: days.slice(-7) };
}

// 쉬운 버전 API 요구사항: 최근 7일 유틸과 간단 계산기들
export function getLast7Dates(todayStr?: string) {
  // KST(UTC+9) 기준 YYYY-MM-DD 생성
  const base = todayStr ? new Date(todayStr) : new Date();
  const toYmdKST = (d: Date) => {
    const kst = new Date(d.getTime() + 9*60*60*1000);
    return kst.toISOString().slice(0,10);
  };
  const arr: string[] = [];
  for (let i=6;i>=0;i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    arr.push(toYmdKST(d));
  }
  return arr;
}

function pickDayEmotion(entries: DiaryEntry[], date: string): Emotion | null {
  const list = entries.filter(e=> e.date === date);
  if (!list.length) return null;
  list.sort((a,b)=> a.timestampUtc.localeCompare(b.timestampUtc));
  return list[list.length-1].emotion;
}

export function calculateSynchronySimple(my: DiaryEntry[], spouse: DiaryEntry[], dates: string[]) {
  let hit=0, total=0;
  for (const d of dates) {
    const a = pickDayEmotion(my, d);
    const b = pickDayEmotion(spouse, d);
    if (a===null || b===null) continue;
    total++;
    if (Math.abs(EMOTION_VALENCE[a]-EMOTION_VALENCE[b]) <= 1) hit++;
  }
  return total ? Math.round((hit/total)*100) : 0;
}

export function findGapEpisodesSimple(my: DiaryEntry[], spouse: DiaryEntry[], dates: string[]) {
  const out: string[] = [];
  for (const d of dates) {
    const a = pickDayEmotion(my, d);
    const b = pickDayEmotion(spouse, d);
    if (a===null || b===null) continue;
    if (Math.abs(EMOTION_VALENCE[a]-EMOTION_VALENCE[b]) >= 2) out.push(d);
  }
  return out;
}

export function findGapEpisodes(my: DiaryEntry[], spouse: DiaryEntry[]) {
  const myByDate = groupByDate(my);
  const spByDate = groupByDate(spouse);
  const days = Array.from(new Set([...Object.keys(myByDate), ...Object.keys(spByDate)])).sort();
  const hits: Array<{ date: string; my: Emotion | undefined; spouse: Emotion | undefined; diff: number }> = [];

  for (const d of days) {
    const m = pickLastByTime(myByDate[d] || []);
    const s = pickLastByTime(spByDate[d] || []);
    if (!m || !s) continue;
    const diff = Math.abs(EMOTION_VALENCE[m.emotion] - EMOTION_VALENCE[s.emotion]);
    if (diff >= 2) hits.push({ date: d, my: m?.emotion, spouse: s?.emotion, diff });
  }
  return { value: hits.length, samples: hits, window: days.slice(-7) };
}

export function calcReassuranceLatency(my: DiaryEntry[], spouse: DiaryEntry[]) {
  // 배우자의 불안 단서(텍스트) 이후 나의 '안심신호'까지 평균 시간(h)
  const anxietyClues = [/불안/, /걱정/, /초조/, /두렵/];
  const mySorted = my.slice().sort((a, b) => (a.timestampUtc < b.timestampUtc ? -1 : 1));
  const spouseSorted = spouse.slice().sort((a, b) => (a.timestampUtc < b.timestampUtc ? -1 : 1));
  const latencies: number[] = [];
  const samples: Array<{ clueAt: string; reassureAt?: string; hours?: number; clueText: string }> = [];

  for (const s of spouseSorted) {
    const clue = anxietyClues.some((re) => re.test(s.text || ''));
    if (!clue) continue;
    const clueTime = new Date(s.timestampUtc).getTime();
    const nextMine = mySorted.find((m) => {
      const t = new Date(m.timestampUtc).getTime();
      return t > clueTime && (m.interactions || []).includes('안심신호');
    });
    if (nextMine) {
      const hours = (new Date(nextMine.timestampUtc).getTime() - clueTime) / (1000 * 60 * 60);
      latencies.push(hours);
      samples.push({ clueAt: s.timestampUtc, reassureAt: nextMine.timestampUtc, hours, clueText: s.text });
    } else {
      samples.push({ clueAt: s.timestampUtc, clueText: s.text });
    }
  }

  const value = latencies.length ? Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)) : 0;
  return { value, samples, window: 'pairwise-next' };
}

export function detectRepairAttempts(entries: DiaryEntry[]) {
  // '사과/유머/스킨십' 신호 후 다음 기록에서 valence +1 이상이면 성공
  const repairSignals = [/미안|사과/, /농담|유머/, /포옹|안아/];
  const sorted = entries.slice().sort((a, b) => (a.timestampUtc < b.timestampUtc ? -1 : 1));
  let attempts = 0;
  let success = 0;
  const samples: Array<{ at: string; nextAt?: string; delta?: number; text: string }> = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const nxt = sorted[i + 1];
    const hasSignal = repairSignals.some((re) => re.test(cur.text || ''));
    if (!hasSignal) continue;
    attempts++;
    const delta = EMOTION_VALENCE[nxt.emotion] - EMOTION_VALENCE[cur.emotion];
    if (delta >= 1) success++;
    samples.push({ at: cur.timestampUtc, nextAt: nxt.timestampUtc, delta, text: cur.text });
  }
  return { value: { attempts, success }, samples, window: 'sequential' };
}


