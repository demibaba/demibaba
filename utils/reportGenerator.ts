import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import type { Report } from '../types/report';

// 감정 매핑(프로젝트에서 쓰는 키에 맞춰 조정)
const EMOTION_POLARITY: Record<string, 'positive'|'negative'|'neutral'> = {
  joy: 'positive', surprise: 'positive',
  sadness: 'negative', anger: 'negative', fear: 'negative', disgust: 'negative',
  neutral: 'neutral',
};

const toYMD = (d: Date): string => {
  const iso = d.toISOString();
  const idx = iso.indexOf('T');
  return idx >= 0 ? iso.slice(0, idx) : iso;
};

function getLastWeekRange(): { start: string; end: string } {
  const end = new Date(); // 오늘
  end.setHours(0,0,0,0);
  const start = new Date(end);
  start.setDate(end.getDate() - 6); // 오늘 포함 7일
  return { start: toYMD(start), end: toYMD(end) };
}

// 간단 키워드 추출(아주 러프—MVP)
function extractKeywords(texts: string[], topN = 5) {
  const bag: Record<string, number> = {};
  const stop = new Set(['그리고','하지만','그래서','오늘','나는','우리는','너무','조금','정말','그냥','하다','했다','있다','였다','에서','으로','에게','보다']);
  texts.forEach(t => {
    t.replace(/\n/g,' ').split(/\s+/).forEach(w => {
      const key = w.toLowerCase().replace(/[^\p{Letter}\p{Number}]/gu,'');
      if (!key || stop.has(key) || key.length<2) return;
      bag[key] = (bag[key]||0)+1;
    });
  });
  return Object.entries(bag).sort((a,b)=>b[1]-a[1]).slice(0, topN).map(([k])=>k);
}

// 감정 비율 계산
function computeEmotionSummary(entries: any[]) {
  let pos=0, neg=0, neu=0;
  const tally: Record<string, number> = {};
  entries.forEach(e => {
    const emos: string[] = e.emotions || e.emotionStickers || e.emotion ? [e.emotion] : [];
    emos.forEach(em => {
      tally[em] = (tally[em]||0)+1;
      const p = EMOTION_POLARITY[em] || 'neutral';
      if (p==='positive') pos++;
      else if (p==='negative') neg++;
      else neu++;
    });
  });
  const total = pos+neg+neu || 1;
  const topEmotions = Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k);
  return {
    positive: Math.round((pos/total)*100),
    negative: Math.round((neg/total)*100),
    neutral: Math.round((neu/total)*100),
    topEmotions,
  };
}

// (MVP) AI 호출 자리 – 지금은 보수적 텍스트 생성 (실서비스에선 서버에서 모델 호출 권장)
async function generateAiInsights(payload: {
  myProfile: any, spouseProfile: any, emotionSummary: any, diaryStats: any
}) {
  // 단정 금지/의료 경고 톤으로 안전하게
  const { myProfile, spouseProfile, emotionSummary, diaryStats } = payload;
  const myAttach = myProfile?.attachmentType || '알 수 없음';
  const spAttach = spouseProfile?.attachmentType || '알 수 없음';

  return [
    '※ 본 분석은 참고용 정보이며 전문적인 진단이나 상담을 대체하지 않습니다.',
    '',
    '이번 주 돌아보기',
    `• 기록: ${diaryStats.daysActive}일 / ${diaryStats.totalEntries}회`,
    `• 감정 분포: 긍정 ${emotionSummary.positive}% · 중립 ${emotionSummary.neutral}% · 부정 ${emotionSummary.negative}%`,
    emotionSummary.topEmotions.length ? `• 자주 나타난 감정: ${emotionSummary.topEmotions.join(', ')}` : '',
    '',
    '관계 맥락에서의 시사점(가능성)',
    `• 내 애착 경향: ${myAttach}, 배우자: ${spAttach}. 두 사람의 조합에 따라 갈등 시 선호하는 대처가 다를 수 있습니다.`,
    '• 최근 감정 흐름을 보면, 특정 상황에서 반복되는 감정 패턴이 있었을 가능성이 있습니다.',
    '',
    '다음 주에 시도해볼 작은 행동',
    '• 대화 시작은 구체적인 관찰로(“어제 저녁에 ~가 있었고, 나는 ~하게 느꼈어”).',
    '• 상대의 의도 가정 대신 확인 질문(“그때 어떤 느낌이었어?”)을 1회 추가.',
    '• 긍정 피드백 1일 1회(“고마웠어”, “수고했어”)를 습관화.',
  ].filter(Boolean).join('\n');
}

// 지난 주 보고서가 있는지 확인
export async function ensureWeeklyReport(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const { start, end } = getLastWeekRange();

  const qRef = query(
    collection(db, 'weeklyReports'),
    where('userId','==', user.uid),
    where('startDate','==', start),
    where('endDate','==', end),
    orderBy('startDate','desc')
  );
  const snap = await getDocs(qRef);
  if (!snap.empty) {
    const first = snap.docs[0];
    return first ? first.id : null; // 이미 있음
  }
  const userId: string = user.uid as string;
  return await createWeeklyReportForRange(userId, start, end);
}

export async function createWeeklyReportForRange(
  userId: string,
  startDate: string,
  endDate: string,
  reportType: 'weekly' | 'monthly' | 'custom' = 'weekly'
) {
  // 1) 내 프로필/배우자 프로필
  const myDoc = await getDoc(doc(db,'users', userId));
  const myProfile = myDoc.data() || {};
  let spouseProfile = null as any;
  const spouseId: string = (myProfile?.spouseId ?? '') as string;
  if (spouseId && spouseId.length > 0) {
    const sDoc = await getDoc(doc(db,'users', String(spouseId)));
    spouseProfile = sDoc.exists() ? sDoc.data() : null;
  }

  // 2) 지난 7일 일기
  const dSnap = await getDocs(query(
    collection(db,'diaries'),
    where('userId','==', userId),
    where('date','>=', startDate),
    where('date','<=', endDate),
    orderBy('date','asc')
  ));
  const entries = dSnap.docs.map(d=>d.data());
  const texts = entries.map(e=> (e?.text ?? e?.quickCheck?.todayEvent ?? '') as string).filter((t): t is string => Boolean(t));

  // 3) 집계
  const emotionSummary = computeEmotionSummary(entries);
  const daysActive = new Set(entries.map(e=>e.date)).size;
  const totalEntries = entries.length;
  const totalWords = texts.reduce((sum, t)=> sum + (t ? t.split(/\s+/).length : 0), 0);
  const avgWordsPerEntry = totalEntries ? Math.round(totalWords/totalEntries) : 0;
  const keywords = extractKeywords(texts);

  const diaryStats = { totalEntries, daysActive, avgWordsPerEntry, keywords };

  // 4) AI 인사이트(보수적)
  const aiInsights = await generateAiInsights({ myProfile, spouseProfile, emotionSummary, diaryStats });

  // 5) 저장
  const ref = await addDoc(collection(db,'weeklyReports'), {
    userId,
    type: reportType,
    startDate,
    endDate,
    emotionSummary,
    diaryStats,
    profileBrief: {
      myAttachment: myProfile?.attachmentType || null,
      spouseAttachment: spouseProfile?.attachmentType || null,
      myLoveLanguage: myProfile?.loveLanguage || null,
      spouseLoveLanguage: spouseProfile?.loveLanguage || null,
    },
    aiInsights,
    isRead: false,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

function getLastMonthRange(): { start: string; end: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - 29); // 최근 30일(오늘 포함)
  return { start: toYMD(start), end: toYMD(end) };
}

export async function generateReport(
  userId: string,
  mode:
    | 'weekly'
    | 'monthly'
    | { start: string; end: string },
  options?: { force?: boolean }
): Promise<string | null> {
  const force = options?.force === true;
  if (typeof mode === 'string') {
    if (mode === 'weekly') {
      if (!force) {
        const existing = await ensureWeeklyReport();
        if (existing) return existing;
      }
      const { start, end } = getLastWeekRange();
      return await createWeeklyReportForRange(userId, start, end, 'weekly');
    }
    if (mode === 'monthly') {
      const { start, end } = getLastMonthRange();
      return await createWeeklyReportForRange(userId, start, end, 'monthly');
    }
    return null;
  }
  // custom range
  const { start, end } = mode;
  return await createWeeklyReportForRange(userId, start, end, 'custom');
}

// 간단 래퍼: 주간 레포트 생성 API
export type GenerateResult = { reportId: string };
export async function generateWeeklyReport(options?: { openAfter?: boolean }): Promise<GenerateResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");

  // 1) 기간 계산 (지난 7일)
  const end = new Date();
  const start = new Date(); start.setDate(end.getDate() - 6);
  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];

  // 2) 데이터 모으기 (간단 mock)
  const payload = {
    userId: user.uid,
    type: "weekly",
    startDate,
    endDate,
    emotionSummary: { positive: 0, negative: 0, neutral: 0, topEmotions: [] as string[] },
    relationshipScore: { criticism: 0, contempt: 0, defensiveness: 0, stonewalling: 0 },
    diaryStats: { totalEntries: 0, avgWordsPerEntry: 0, keywords: [] as string[] },
    aiInsights: "",
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  // 3) (선택) AI 호출
  // const insights = await callClaude(payload);
  // payload.aiInsights = insights;

  // 4) 저장
  const reportId = `${user.uid}_${Date.now()}`;
  await setDoc(doc(db, "weeklyReports", reportId), { id: reportId, ...payload });

  return { reportId };
}
