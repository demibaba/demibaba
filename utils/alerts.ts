import { DiaryEntry, Emotion } from '../types/diary';

const VAL: Record<Emotion, number> = { terrible:-2, bad:-1, neutral:0, good:1, great:2 };

function dateKey(d: Date) { return d.toISOString().slice(0,10); }

export function buildAlerts({ my, spouse }: { my: DiaryEntry[]; spouse: DiaryEntry[] }) {
  const alerts: { level:'red'|'yellow'; message:string; nextWindow?:string }[] = [];

  // --- Yellow: 5일 연속 한줄일기 5단어 미만 ---
  const last7 = getLastNDates(7);
  const smallDays = last7.filter(d => {
    const mine = my.filter(e=>e.date===d);
    const wc = mine.reduce((a,b)=>a+(b.wordCount||0), 0);
    return wc < 5;
  }).length;
  if (smallDays >= 5) {
    alerts.push({ level:'yellow', message:'최근 일기가 너무 짧아요 (5일). 오늘은 한 문장만 더 적어볼까요?' });
  }

  // --- Red: 48h 연속 불일치 + "재확인 지연" > 8h (간단판) ---
  const gapStreakHrs = calcGapStreakHours(my, spouse);
  const simulatedLatency = 9; // todo: calcReassuranceLatency 사용(여기선 간단히 9h로)
  if (gapStreakHrs >= 48 && simulatedLatency > 8) {
    alerts.push({ level:'red', message:'48시간 연속 감정 불일치 + 반응 지연', nextWindow:'다음 화 09–10 주의' });
  }

  return alerts;
}

function getLastNDates(n: number) {
  const arr: string[] = [];
  for (let i=n-1;i>=0;i--) {
    const d = new Date();
    d.setDate(d.getDate()-i);
    arr.push(dateKey(d));
  }
  return arr;
}

function pickDayEmotion(entries: DiaryEntry[], date: string): Emotion | null {
  const list = entries.filter(e=>e.date===date);
  if (!list.length) return null;
  list.sort((a,b)=>a.timestampUtc.localeCompare(b.timestampUtc));
  return list[list.length-1].emotion;
}

function calcGapStreakHours(my: DiaryEntry[], spouse: DiaryEntry[]) {
  let streak = 0; // 시간
  for (let i=0;i<3;i++) { // 3일(72h)만 확인 (간단)
    const d = new Date();
    d.setDate(d.getDate()-i);
    const dk = dateKey(d);
    const a = pickDayEmotion(my, dk);
    const b = pickDayEmotion(spouse, dk);
    if (a && b && Math.abs(VAL[a]-VAL[b])>=2) streak += 24;
    else break;
  }
  return streak; // 시간 단위
}


