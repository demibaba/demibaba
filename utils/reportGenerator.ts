import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import type { Report } from '../types/report';
import { analyzeRelationshipData, formatAnalysisAsText } from './aiAnalyzer';

// 감정 매핑 - 실제 앱에서 사용하는 키워드에 맞춤
const EMOTION_POLARITY: Record<string, 'positive'|'negative'|'neutral'> = {
  great: 'positive',
  good: 'positive', 
  neutral: 'neutral',
  bad: 'negative',
  terrible: 'negative',
  // 추가 감정들
  joy: 'positive', 
  happiness: 'positive',
  sadness: 'negative', 
  anger: 'negative', 
  fear: 'negative', 
  disgust: 'negative',
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

// 감정 정규화 함수 (calendar.tsx와 일치)
const normalize = (raw: any): string | null => {
  const s = String(raw ?? "").toLowerCase();
  if (s === 'great') return 'great';
  if (s === 'good') return 'good';
  if (s === 'neutral') return 'neutral';
  if (s === 'bad') return 'bad';
  if (s === 'terrible') return 'terrible';
  return null;
};

const normalizeArr = (arr: any): string[] =>
  Array.isArray(arr) ? arr.map(normalize).filter(Boolean) as string[] : [];

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

// 감정 비율 계산 (실제 데이터 필드명에 맞춤)
function computeEmotionSummary(entries: any[]) {
  let pos=0, neg=0, neu=0;
  const tally: Record<string, number> = {};
  
  console.log('감정 분석 시작, 총 엔트리:', entries.length);
  
  entries.forEach((e, index) => {
    console.log(`엔트리 ${index}:`, e);
    
    // 다양한 감정 필드 형태 처리
    let emos: string[] = [];
    
    if (typeof e.emotion === "string") {
      const n = normalize(e.emotion);
      if (n) emos = [n];
    } else if (Array.isArray(e.emotions)) {
      emos = normalizeArr(e.emotions);
    } else if (Array.isArray(e.emotionStickers)) {
      emos = normalizeArr(e.emotionStickers);
    }
    
    console.log(`엔트리 ${index} 정규화된 감정:`, emos);
    
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
  
  const result = {
    positive: Math.round((pos/total)*100),
    negative: Math.round((neg/total)*100),
    neutral: Math.round((neu/total)*100),
    topEmotions,
  };
  
  console.log('감정 요약 결과:', result);
  return result;
}

// 배우자 연결 상태 확인 (임시 구현)
async function getConnectedSpouseId(userId: string): Promise<string | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.spouseId || userData.partnerId || null;
    }
    return null;
  } catch (error) {
    console.error('배우자 ID 조회 실패:', error);
    return null;
  }
}

// 사용자 데이터 조회 (임시 구현)
async function getUserData(userId: string, startDate?: string, endDate?: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // 기간별 일기 데이터도 포함
    let diaryData = [];
    if (startDate && endDate) {
      const diarySnap = await getDocs(query(
        collection(db, 'diaries'),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      ));
      diaryData = diarySnap.docs.map(d => d.data());
    }
    
    return {
      userId,
      ...userData,
      diaryEntries: diaryData
    };
  } catch (error) {
    console.error('사용자 데이터 조회 실패:', error);
    return { userId };
  }
}

// 커플 분석 (간단한 임시 구현)
async function analyzeCoupleRelationship(myData: any, spouseData: any) {
  // 향후 구현될 고도화된 커플 분석
  // 현재는 기본 구조만 제공
  return {
    individualSummary: {
      my: {
        name: myData.name || '나',
        score: 75,
        attachment: myData.attachmentType || 'N/A'
      },
      spouse: {
        name: spouseData.name || '배우자',
        score: 75,
        attachment: spouseData.attachmentType || 'N/A'
      }
    },
    coupleDynamics: {
      overallScore: 75,
      attachmentPattern: {
        dynamics: '안정적인 관계 패턴'
      }
    },
    coupleRecommendations: {
      immediate: [
        { action: '매일 감정 체크인 시간 갖기' }
      ],
      weekly: [
        { title: '함께하는 활동 늘리기' }
      ]
    }
  };
}

// AI 인사이트 생성
async function generateAiInsights(payload: {
  myProfile: any;
  spouseProfile: any;
  emotionSummary: any;
  diaryStats: any;
}): Promise<string> {
  const { myProfile, spouseProfile, emotionSummary, diaryStats } = payload;

  // AI 분석용 데이터 구성
  const analysisData = {
    phq9Score: myProfile?.phq9Score,
    gad7Score: myProfile?.gad7Score,
    attachmentType: myProfile?.attachmentType,
    personalityType: myProfile?.personalityType,
    emotionSummary,
    diaryStats,
    profileBrief: {
      myAttachment: myProfile?.attachmentType || null,
      spouseAttachment: spouseProfile?.attachmentType || null,
      myLoveLanguage: myProfile?.loveLanguage || null,
      spouseLoveLanguage: spouseProfile?.loveLanguage || null,
    },
  };

  try {
    const analysis = await analyzeRelationshipData(analysisData as any);
    return formatAnalysisAsText(analysis);
  } catch (error) {
    console.error('AI 분석 중 오류:', error);
    return [
      '※ 본 분석은 참고용이며 전문적인 진단이나 상담을 대체하지 않습니다.',
      '',
      '이번 주 돌아보기',
      `• 기록: ${diaryStats.daysActive}일 / ${diaryStats.totalEntries}회`,
      `• 감정 분포: 긍정 ${emotionSummary.positive}% · 중립 ${emotionSummary.neutral}% · 부정 ${emotionSummary.negative}%`,
      emotionSummary.topEmotions.length ? `• 자주 나타난 감정: ${emotionSummary.topEmotions.join(', ')}` : '',
      '',
      '다음 주에 시도해볼 작은 행동',
      '• 대화 시작은 구체적인 관찰로 시작하기',
      '• 상대의 의도 확인 질문 1회 추가하기',
      '• 긍정 피드백 1일 1회 표현하기',
    ].filter(Boolean).join('\n');
  }
}

// 실제 데이터로 레포트 생성
export async function createWeeklyReportForRange(
  userId: string,
  startDate: string,
  endDate: string,
  reportType: 'weekly' | 'monthly' | 'custom' = 'weekly'
) {
  console.log('레포트 생성 시작:', { userId, startDate, endDate, reportType });
  
  // 1) 내 프로필/배우자 프로필
  const myDoc = await getDoc(doc(db,'users', userId));
  const myProfile = myDoc.data() || {};
  const spouseId: string | null = await getConnectedSpouseId(userId);
  let spouseProfile = null as any;
  if (spouseId) {
    const sDoc = await getDoc(doc(db,'users', String(spouseId)));
    spouseProfile = sDoc.exists() ? sDoc.data() : null;
  }

  // 2) 해당 기간 일기 조회 (본인)
  console.log('일기 조회 중:', { userId, startDate, endDate });
  const dSnap = await getDocs(query(
    collection(db,'diaries'),
    where('userId','==', userId),
    where('date','>=', startDate),
    where('date','<=', endDate),
    orderBy('date','asc')
  ));
  const entries = dSnap.docs.map(d=>d.data());
  console.log('조회된 일기 수:', entries.length);
  
  const texts = entries.map(e=> (e?.text ?? e?.quickCheck?.todayEvent ?? '') as string).filter((t): t is string => Boolean(t));

  // 3) 집계 (본인)
  const emotionSummary = computeEmotionSummary(entries);
  const daysActive = new Set(entries.map(e=>e.date)).size;
  const totalEntries = entries.length;
  const totalWords = texts.reduce((sum, t)=> sum + (t ? t.split(/\s+/).length : 0), 0);
  const avgWordsPerEntry = totalEntries ? Math.round(totalWords/totalEntries) : 0;
  const keywords = extractKeywords(texts);

  const diaryStats = { totalEntries, daysActive, avgWordsPerEntry, keywords };
  console.log('통계 결과:', diaryStats);

  // 4) 커플 분석(배우자 연결 시)
  let reportScope: 'individual' | 'couple' = 'individual';
  let coupleAnalysis: any = null;
  if (spouseId && spouseProfile) {
    try {
      const [myData, spouseData] = await Promise.all([
        getUserData(userId, startDate, endDate),
        getUserData(spouseId, startDate, endDate)
      ]);
      coupleAnalysis = await analyzeCoupleRelationship(myData, spouseData);
      reportScope = 'couple';
    } catch (e) {
      console.warn('커플 분석 실패, 개인 분석으로 진행:', e);
      reportScope = 'individual';
    }
  }

  // 5) AI 인사이트 (텍스트 요약은 계속 유지)
  const aiInsights = await generateAiInsights({ myProfile, spouseProfile, emotionSummary, diaryStats });

  // 6) 저장
  const reportData = {
    userId,
    type: reportType,
    reportScope, // 'individual' | 'couple'
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
    ...(coupleAnalysis ? { coupleAnalysis } : {}),
  };
  
  console.log('저장할 레포트 데이터:', reportData);
  const ref = await addDoc(collection(db,'weeklyReports'), reportData);
  console.log('레포트 저장 완료:', ref.id);

  return ref.id;
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

// 수정된 generateWeeklyReport - 실제 데이터 분석
export type GenerateResult = { reportId: string };
export async function generateWeeklyReport(options?: { openAfter?: boolean }): Promise<GenerateResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");

  console.log('generateWeeklyReport 호출됨');
  
  // 실제 레포트 생성 로직 사용
  const { start, end } = getLastWeekRange();
  const reportId = await createWeeklyReportForRange(user.uid, start, end, 'weekly');
  
  if (!reportId) {
    throw new Error('레포트 생성에 실패했습니다.');
  }

  return { reportId };
}
