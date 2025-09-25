// app/calendar.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Text,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../config/firebaseConfig";
import { generateWeeklyReport } from "../utils/reportGenerator";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import DefaultText from "../components/DefaultText";
import MonthPicker from "../components/MonthPicker";
import { LineChart } from "react-native-chart-kit";

const pad2 = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// 감정 매핑
const EMOTION_SCORES: Record<string, number> = {
  great: 3,
  good: 2,
  neutral: 0,
  bad: -2,
  terrible: -3,
};
const EMOTION_COLORS: Record<string, string> = {
  great: "#40C057",
  good: "#82C91E",
  neutral: "#FAB005",
  bad: "#FD7E14",
  terrible: "#F03E3E",
};
const EMOJI: Record<string, string> = {
  great: "😄",
  good: "🙂",
  neutral: "😐",
  bad: "😕",
  terrible: "😢",
};
const normalize = (raw?: any) => {
  const s = String(raw ?? "").toLowerCase();
  if (s === 'great') return 'great';
  if (s === 'good') return 'good';
  if (s === 'neutral') return 'neutral';
  if (s === 'bad') return 'bad';
  if (s === 'terrible') return 'terrible';
  return null;
};
const normalizeArr = (arr: any) =>
  Array.isArray(arr) ? arr.map(normalize).filter(Boolean) as string[] : [];

type Diary = { date: string; text: string; emotions: string[] };

export default function CalendarPage() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [diaryDates, setDiaryDates] = useState<string[]>([]);
  const [diaryEmotions, setDiaryEmotions] = useState<Record<string, string[]>>({});
  const [weekly, setWeekly] = useState<Diary[]>([]);
  const [todayChecked, setTodayChecked] = useState(false);
  const [spouseEmotions, setSpouseEmotions] = useState<Record<string, string[]>>({});
  const [spouseConnected, setSpouseConnected] = useState(false);

  // 바텀시트(미리보기/수정)
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<string>("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalText, setModalText] = useState("");
  const [modalEmotions, setModalEmotions] = useState<string[]>([]);
  const [modalConversation, setModalConversation] = useState<boolean | null>(null);
  const [modalGoals, setModalGoals] = useState({
    conversation10min: false,
    gratitudeShare: false,
    dateActivity: false,
    physicalTouch: false,
  });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // 오늘 체크인 여부
  const refreshToday = async () => {
    if (!auth.currentUser) return;
    try {
      const id = `${auth.currentUser.uid}_${ymd(new Date())}`;
      const snap = await getDoc(doc(db, "diaries", id));
      setTodayChecked(snap.exists());
    } catch {
      setTodayChecked(false);
    }
  };

  // 월간 데이터
  useEffect(() => {
    const run = async () => {
      if (!auth.currentUser) return;
      try {
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        const qy = query(
          collection(db, "diaries"),
          where("userId", "==", auth.currentUser.uid),
          where("date", ">=", ymd(start)),
          where("date", "<", ymd(next))
        );
        const snap = await getDocs(qy);
        const dates: string[] = [];
        const emoByDate: Record<string, string[]> = {};
        snap.forEach(s => {
          const d: any = s.data();
          if (!d?.date) return;
          dates.push(d.date);
          let emos: string[] = [];
          if (typeof d.emotion === "string") {
            const n = normalize(d.emotion);
            if (n) emos = [n];
          } else if (Array.isArray(d.emotions)) {
            emos = normalizeArr(d.emotions);
          } else if (Array.isArray(d.emotionStickers)) {
            emos = normalizeArr(d.emotionStickers);
          }
          if (emos.length) emoByDate[d.date] = emos;
        });
        setDiaryDates(dates);
        setDiaryEmotions(emoByDate);
      } catch (e) {
        console.log("fetch month error", e);
      }
    };
    run();
  }, [currentMonth]);

  // 주간 데이터
  const refreshWeekly = async () => {
    if (!auth.currentUser) return;
    try {
      const today = new Date();
      const from = new Date();
      from.setDate(today.getDate() - 6);
      console.log('Fetching from:', ymd(from), 'to:', ymd(today));
      const qy = query(
        collection(db, "diaries"),
        where("userId", "==", auth.currentUser.uid),
        where("date", ">=", ymd(from)),
        where("date", "<=", ymd(today))
      );
      const snap = await getDocs(qy);
      const arr: Diary[] = [];
      snap.forEach(s => {
        const d: any = s.data();
        console.log('Raw diary data:', d);
        if (!d?.date) return;
        let emos: string[] = [];
        if (typeof d.emotion === "string") {
          const n = normalize(d.emotion);
          if (n) emos = [n];
        } else if (Array.isArray(d.emotions)) {
          emos = normalizeArr(d.emotions);
        } else if (Array.isArray(d.emotionStickers)) {
          emos = normalizeArr(d.emotionStickers);
        }
        console.log('Normalized emotions for', d.date, ':', emos);
        arr.push({ date: d.date, text: d.text || d.quickCheck?.todayEvent || "", emotions: emos });
      });
      console.log('Final weekly array:', arr);
      setWeekly(arr);
    } catch (e) {
      console.log("weekly error", e);
    }
  };

  useEffect(() => {
    refreshWeekly();
    refreshToday();
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  // 화면 복귀 시 데이터 새로고침
  useFocusEffect(
    React.useCallback(() => {
      refreshWeekly();
      refreshToday();
      // 월간 데이터도 새로고침 (currentMonth 의존)
      const run = async () => {
        if (!auth.currentUser) return;
        try {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth();
          const start = new Date(year, month, 1);
          const next = new Date(year, month + 1, 1);
          const qy = query(
            collection(db, 'diaries'),
            where('userId', '==', auth.currentUser.uid),
            where('date', '>=', ymd(start)),
            where('date', '<', ymd(next))
          );
          const snap = await getDocs(qy);
          const dates: string[] = [];
          const emoByDate: Record<string, string[]> = {};
          snap.forEach(s => {
            const d: any = s.data();
            if (!d?.date) return;
            dates.push(d.date);
            let emos: string[] = [];
            if (typeof d.emotion === 'string') {
              const n = normalize(d.emotion);
              if (n) emos = [n];
            } else if (Array.isArray(d.emotions)) {
              emos = normalizeArr(d.emotions);
            } else if (Array.isArray(d.emotionStickers)) {
              emos = normalizeArr(d.emotionStickers);
            }
            if (emos.length) emoByDate[d.date] = emos;
          });
          setDiaryDates(dates);
          setDiaryEmotions(emoByDate);
        } catch (e) {
          console.log('refreshMonthly error', e);
        }
      };
      run();
    }, [currentMonth])
  );

  // 날짜 클릭 → 바텀시트 열고 해당 일기 로드
  const openDay = async (dateStr: string) => {
    const today = ymd(new Date());

    // 오늘이면 상세 페이지로 바로 이동
    if (dateStr === today) {
      router.push({ pathname: "/diary/[date]", params: { date: dateStr } as any });
      return;
    }

    // 과거 날짜는 바텀시트 미리보기
    if (!auth.currentUser) return;
    setShowModal(true);
    setEditMode(false);
    setModalDate(dateStr);
    setModalLoading(true);
    try {
      // 1) id 규칙으로 조회
      const id = `${auth.currentUser.uid}_${dateStr}`;
      let snap = await getDoc(doc(db, "diaries", id));
      let d: any | null = snap.exists() ? snap.data() : null;

      // 2) 없으면 필드 검색(이전 데이터 호환)
      if (!d) {
        const qy = query(
          collection(db, "diaries"),
          where("userId", "==", auth.currentUser.uid),
          where("date", "==", dateStr)
        );
        const qSnap = await getDocs(qy);
        qSnap.forEach(s => { if (!d) d = s.data(); });
      }

      const text = d?.text || d?.quickCheck?.todayEvent || "";
      let emos: string[] = [];
      if (typeof d?.emotion === "string") {
        const n = normalize(d?.emotion);
        if (n) emos = [n];
      } else if (Array.isArray(d?.emotions)) {
        emos = normalizeArr(d?.emotions);
      } else if (Array.isArray(d?.emotionStickers)) {
        emos = normalizeArr(d?.emotionStickers);
      }
      setModalText(text);
      setModalEmotions(emos);
      setModalConversation(d?.hadConversation ?? null);
      setModalGoals(d?.goalsCompleted || {
        conversation10min: false,
        gratitudeShare: false,
        dateActivity: false,
        physicalTouch: false,
      });
    } catch (e) {
      console.log("openDay error", e);
      setModalText("");
      setModalEmotions([]);
      setModalConversation(null);
      setModalGoals({ conversation10min: false, gratitudeShare: false, dateActivity: false, physicalTouch: false });
    } finally {
      setModalLoading(false);
    }
  };

  const saveDay = async () => {
    if (!auth.currentUser || !modalDate) return;
    setSaving(true);
    try {
      const id = `${auth.currentUser.uid}_${modalDate}`;
      await setDoc(
        doc(db, "diaries", id),
        {
          userId: auth.currentUser.uid,
          date: modalDate,
          text: modalText,
          emotions: modalEmotions,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      // 로컬 캐시 반영
      setDiaryDates(prev => (prev.includes(modalDate) ? prev : [...prev, modalDate]));
      setDiaryEmotions(prev => ({ ...prev, [modalDate]: modalEmotions }));
      refreshWeekly();
      setEditMode(false);
    } catch (e) {
      console.log("save error", e);
    } finally {
      setSaving(false);
    }
  };

  const handleToday = () => {
    const today = ymd(new Date());
    router.push({
      pathname: '/diary/[date]',
      params: { date: today } as any,
    });
  };

  // 부부 감정 차트 데이터
  const getChartData = () => {
    const today = new Date();
    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
    const labels: string[] = [];
    const myData: (number | null)[] = [];
    const hasData: boolean[] = [];
    console.log('=== Weekly Data Debug ===');
    console.log('weekly array:', weekly);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = ymd(d);
      const dayName = weekDays[d.getDay()] as string;
      labels.push(dayName);
      const dayEntry = weekly.find((w: any) => String(w.date) === String(key)) as any;
      console.log(`${dayName} (${key}):`, dayEntry);
      if (!dayEntry || !(dayEntry.emotions?.length)) {
        myData.push(null);
        hasData.push(false);
      } else {
        const emotion = dayEntry.emotions[0] as keyof typeof EMOTION_SCORES | undefined;
        const score = emotion !== undefined ? (EMOTION_SCORES[emotion] as number | undefined) : undefined;
        console.log(`  감정: ${String(emotion)}, 점수: ${String(score)}`);
        if (score !== undefined) {
          myData.push(score);
          hasData.push(true);
        } else {
          myData.push(null);
          hasData.push(false);
        }
      }
    }
    const adjustedData = myData.map(v => (v !== null ? (v as number) + 3 : 3));
    console.log('Final chart data (raw):', myData);
    console.log('Final chart data (adjusted +3):', adjustedData);
    return { labels, myData: adjustedData, hasData };
  };

  // 인사이트 헬퍼들
  const getBestDay = () => {
    const chart = getChartData();
    let maxScore = -999;
    let bestIdx = -1;
    chart.myData.forEach((score, idx) => {
      const s = (score ?? -999) as number;
      if (s > maxScore) {
        maxScore = s;
        bestIdx = idx;
      }
    });
    return bestIdx >= 0 ? chart.labels[bestIdx] : null;
  };

  const getConversationRate = () => {
    // TODO: weekly에서 hadConversation 비율 계산 (임시 값)
    return 70;
  };

  const getImprovementPoint = () => {
    if (weekly.length < 4) return '주 4일 이상 기록해보세요';
    if (getConversationRate() < 50) return '대화 시간을 늘려보세요';
    return '감사 표현을 더 자주 해보세요';
  };

  // === 인사이트: 더 재미있는 분석 ===
  const calculateWeekdayAverage = () => {
    const chart = getChartData();
    const indices = chart.labels.map((l, i) => (['월', '화', '수', '목', '금'].includes(l) ? i : -1)).filter(i => i >= 0);
    if (!indices.length) return 0;
    const sum = indices.reduce((s, i) => s + ((chart.myData[i] ?? 0) as number), 0);
    return sum / indices.length;
  };

  const calculateWeekendAverage = () => {
    const chart = getChartData();
    const indices = chart.labels.map((l, i) => (['토', '일'].includes(l) ? i : -1)).filter(i => i >= 0);
    if (!indices.length) return 0;
    const sum = indices.reduce((s, i) => s + ((chart.myData[i] ?? 0) as number), 0);
    return sum / indices.length;
  };

  const detectMondayBlues = () => {
    const chart = getChartData();
    const monIdx = chart.labels.findIndex(l => l === '월');
    const sunIdx = chart.labels.findIndex(l => l === '일');
    if (monIdx < 0 || sunIdx < 0) return false;
    return (chart.myData[monIdx] ?? 0) <= (chart.myData[sunIdx] ?? 0) - 1;
  };

  const detectMidWeekSlump = () => {
    const chart = getChartData();
    const tue = chart.labels.findIndex(l => l === '화');
    const wed = chart.labels.findIndex(l => l === '수');
    const thu = chart.labels.findIndex(l => l === '목');
    if (tue < 0 || wed < 0 || thu < 0) return false;
    const w = chart.myData[wed] ?? 0;
    return w <= (chart.myData[tue] ?? 0) - 1 && w <= (chart.myData[thu] ?? 0) - 1;
  };

  const calculateEmotionVariance = () => {
    const chart = getChartData();
    const arr = chart.myData.map(v => (v ?? 0));
    const n = arr.length || 1;
    const mean = arr.reduce((s, v) => s + v, 0) / n;
    const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    return variance;
  };

  const detectSuddenImprovement = () => {
    const chart = getChartData();
    for (let i = 1; i < chart.myData.length; i++) {
      const curr = (chart.myData[i] ?? 0) as number;
      const prev = (chart.myData[i - 1] ?? 0) as number;
      if (curr - prev >= 2) return true;
    }
    return false;
  };

  const correlateConversationMood = () => {
    // weekly에서 hadConversation이 있는 경우에만 계산
    const trueScores: number[] = [];
    const falseScores: number[] = [];
    for (const w of weekly) {
      const emo = (w as any)?.emotions?.[0] as keyof typeof EMOTION_SCORES | undefined;
      const score = emo != null && EMOTION_SCORES[emo] != null ? (EMOTION_SCORES[emo] as number) : undefined;
      const conv = (w as any)?.hadConversation as boolean | undefined;
      if (score == null || conv == null) continue;
      if (conv) trueScores.push(score); else falseScores.push(score);
    }
    if (!trueScores.length || !falseScores.length) return false;
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    return avg(falseScores) <= avg(trueScores) - 1;
  };

  const pearson = (a: number[], b: number[]) => {
    const n = Math.min(a.length, b.length);
    if (n === 0) return 0;
    const ax = a.slice(0, n);
    const bx = b.slice(0, n);
    const meanA = ax.reduce((s, v) => s + v, 0) / n;
    const meanB = bx.reduce((s, v) => s + v, 0) / n;
    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < n; i++) {
      const ai = ax[i] ?? 0;
      const bi = bx[i] ?? 0;
      const da = ai - meanA;
      const db = bi - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }
    const den = Math.sqrt(denA * denB);
    if (!den || !isFinite(den)) return 0;
    const r = num / den;
    return isFinite(r) ? r : 0;
  };

  const detectEmotionContagion = () => {
    if (!spouseConnected) return false;
    const chart = getChartData();
    // 배우자 데이터 제거한 버전에서는 비교 불가 → false 처리
    return false;
  };

  const detectOppositePattern = () => {
    if (!spouseConnected) return false;
    const chart = getChartData();
    return false;
  };

  const detectDaySync = () => {
    if (!spouseConnected) return null as string | null;
    const chart = getChartData();
    let myMax = -999, myIdx = -1;
    chart.myData.forEach((v, i) => { const s = (v ?? -999) as number; if (s > myMax) { myMax = s; myIdx = i; } });
    return myIdx >= 0 ? chart.labels[myIdx] : null;
  };

  const getEmotionPattern = () => {
    const patterns: string[] = [];
    const weekdayAvg = calculateWeekdayAverage();
    const weekendAvg = calculateWeekendAverage();
    if (weekendAvg > weekdayAvg + 1) {
      patterns.push('주말에 확실히 더 행복하시네요! 평일 스트레스 관리가 필요해 보여요');
    }
    if (detectMondayBlues()) {
      patterns.push('월요병이 심하시네요. 일요일 저녁 루틴을 바꿔보는 건 어떨까요?');
    }
    if (detectMidWeekSlump()) {
      patterns.push('수요일마다 기분이 다운되네요. 주중 작은 이벤트를 만들어보세요');
    }
    return patterns[0] || null;
  };

  const getUnusualPoint = () => {
    const insights: string[] = [];
    if (calculateEmotionVariance() > 2) {
      insights.push('이번 주 감정 기복이 컸어요. 무슨 일이 있으셨나요?');
    }
    if (detectSuddenImprovement()) {
      insights.push('중반 이후 갑자기 기분이 좋아졌네요! 뭔가 좋은 일이?');
    }
    if (correlateConversationMood()) {
      insights.push('대화 안 한 날은 대체로 기분이 안 좋았어요. 시간을 내어 대화해볼까요?');
    }
    return insights[0] || null;
  };

  const getCoupleSync = () => {
    const sync: string[] = [];
    if (detectEmotionContagion()) {
      sync.push('한 사람이 우울하면 다른 사람도 영향을 받는 경향이 있어요');
    }
    if (detectOppositePattern()) {
      sync.push('서로 반대 감정을 보이는 패턴이 있어요. 균형을 맞추려는 걸까요?');
    }
    const sameDay = detectDaySync();
    if (sameDay) {
      sync.push(`${sameDay}요일엔 둘 다 기분이 좋아요! 데이트 어떠세요?`);
    }
    return sync[0] || null;
  };

  // 통계 카드용 동조율/진행률
  const syncPercent = useMemo(() => {
    const today = new Date();
    let both = 0, synced = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = ymd(d);
      const myArr = (weekly.find((w) => String((w as any).date) === String(key)) as any)?.emotions || [];
      const spArr = spouseEmotions[key] || [];
      if (!myArr.length || !spArr.length) continue;
      both += 1;
      const myEmo = myArr[0] as keyof typeof EMOTION_SCORES | undefined;
      const spEmo = spArr[0] as keyof typeof EMOTION_SCORES | undefined;
      const myScore = myEmo != null && EMOTION_SCORES[myEmo] != null ? (EMOTION_SCORES[myEmo] as number) : 0;
      const spScore = spEmo != null && EMOTION_SCORES[spEmo] != null ? (EMOTION_SCORES[spEmo] as number) : 0;
      if (Math.abs(myScore - spScore) < 1) synced += 1;
    }
    return both ? Math.round((synced / both) * 100) : 0;
  }, [weekly, spouseEmotions]);

  // streak 계산
  const streak = useMemo(() => {
    const set = new Set(diaryDates);
    let s = 0;
    const d = new Date();
    for (;;) {
      const key = ymd(d);
      if (!set.has(key)) break;
      s += 1;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [diaryDates]);

  // 캘린더 렌더
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const pad = first.getDay();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const todayStr = ymd(new Date());

    return (
      <View style={styles.calendar}>
        <View style={styles.weekHeader}>
          {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => (
            <View key={i} style={styles.weekDayCell}>
              <DefaultText style={styles.weekDayText}>{w}</DefaultText>
            </View>
          ))}
        </View>

        {/* 인사이트 카드(중복 제거로 삭제됨) */}

        {weeks.map((row, ri) => (
          <View key={ri} style={styles.week}>
            {row.map((date, di) => {
              if (!date) return <View key={di} style={styles.emptyDay} />;
              const key = ymd(date);
              const emos = diaryEmotions[key] || [];
              const main = emos[0] as keyof typeof EMOTION_COLORS | undefined;
              const isToday = key === todayStr;

              const dayOfWeek = date.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              return (
                <TouchableOpacity
                  key={di}
                  style={[styles.dayCell, isToday && styles.todayCell]}
                  onPress={() => openDay(key)}
                  activeOpacity={0.8}
                >
                  <DefaultText
                    style={[
                      styles.dayNum,
                      isToday && styles.todayNum,
                      dayOfWeek === 0 && styles.sundayNum,
                      dayOfWeek === 6 && styles.saturdayNum,
                    ]}
                  >
                    {date.getDate()}
                  </DefaultText>

                  {/* 날짜 아래 이모지 배치 */}
                  {main && (
                    <Text style={styles.dayEmoji}>{EMOJI[main]}</Text>
                  )}

                  {/* 오늘 점 제거 */}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // 월 변경 함수
  const changeMonth = (direction: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + direction);
    setCurrentMonth(next);
  };

  // 디버깅: 주간 데이터 로드 확인
  useEffect(() => {
    console.log('weekly data:', weekly);
  }, [weekly]);

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />

      {/* 상단 바 - 더 컴팩트하게 */}
      <View style={styles.topBar}>
        <View style={styles.monthSection}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={20} color="#666" />
          </TouchableOpacity>
          <DefaultText style={styles.monthText}>
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </DefaultText>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/reports" as any)}>
            <Ionicons name="bar-chart-outline" size={24} color="#666" />
            <DefaultText style={styles.actionLabel}>분석</DefaultText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/profile" as any)}>
            <Ionicons name="person-circle" size={24} color="#666" />
            <DefaultText style={styles.actionLabel}>프로필</DefaultText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 오늘 체크인 */}
        <TouchableOpacity style={[styles.checkIn, todayChecked && styles.checkInDone]} onPress={handleToday}>
          <View style={styles.checkInLeft}>
            <Ionicons
              name={todayChecked ? "checkmark-circle" : "add-circle"}
              size={30}
              color={todayChecked ? "#40C057" : "#4A90E2"}
            />
            <View style={{ marginLeft: 10 }}>
              <DefaultText style={styles.checkInTitle}>
                {todayChecked ? "오늘 체크인 완료!" : "오늘의 체크인"}
              </DefaultText>
              <DefaultText style={styles.checkInSub}>
                {todayChecked ? "수정/추가하려면 탭하세요" : "감정과 관계 상태 기록하기"}
              </DefaultText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8A94A6" />
        </TouchableOpacity>

        {/* 캘린더 */}
        {renderCalendar()}

        {/* 부부 감정 차트 카드 */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name="analytics-outline" size={20} color="#4A90E2" />
            <DefaultText style={styles.chartTitle}>이번 주 감정 흐름</DefaultText>
          </View>

          <View style={styles.chartContainer}>
            <View style={styles.yAxisContainer}>
              <View style={styles.yAxisItem}>
                <View style={[styles.yAxisDot, { backgroundColor: '#40C057' }]} />
                <DefaultText style={styles.yAxisLabel}>아주좋음</DefaultText>
              </View>
              <View style={styles.yAxisItem}>
                <View style={[styles.yAxisDot, { backgroundColor: '#82C91E' }]} />
                <DefaultText style={styles.yAxisLabel}>좋음</DefaultText>
              </View>
              <View style={styles.yAxisItem}>
                <View style={[styles.yAxisDot, { backgroundColor: '#FAB005' }]} />
                <DefaultText style={styles.yAxisLabel}>보통</DefaultText>
              </View>
              <View style={styles.yAxisItem}>
                <View style={[styles.yAxisDot, { backgroundColor: '#FD7E14' }]} />
                <DefaultText style={styles.yAxisLabel}>나쁨</DefaultText>
              </View>
              <View style={styles.yAxisItem}>
                <View style={[styles.yAxisDot, { backgroundColor: '#F03E3E' }]} />
                <DefaultText style={styles.yAxisLabel}>매우나쁨</DefaultText>
              </View>
            </View>

              <LineChart
                data={{
                labels: getChartData().labels,
                datasets: [{
                  data: getChartData().myData.map((v) => (v === null ? 0 : (v as number))),
                  color: (o = 1) => `rgba(91, 155, 213, ${o})`,
                  strokeWidth: 3,
                }],
                legend: spouseConnected ? ["나", "배우자"] : [],
              }}
              width={W - 144}
              height={180}
              yAxisSuffix=""
              yAxisInterval={1}
              fromZero={true}
              segments={6}
                chartConfig={{
                  backgroundColor: "#FFFFFF",
                  backgroundGradientFrom: "#FFFFFF",
                  backgroundGradientTo: "#FFFFFF",
                decimalPlaces: 0,
                color: (o = 1) => `rgba(200, 200, 200, ${o})`,
                labelColor: (o = 1) => `rgba(130, 130, 130, ${o})`,
                propsForDots: { r: "5", strokeWidth: "2", stroke: "#FFFFFF" },
                propsForBackgroundLines: { strokeDasharray: "", stroke: "#F0F0F0", strokeWidth: 1 },
                }}
                bezier
              style={{ marginVertical: 8 }}
              withInnerLines={true}
                withOuterLines={false}
              withHorizontalLabels={false}
              withVerticalLabels={true}
              withDots={true}
              getDotProps={(dataPoint, index) => ({
                r: getChartData().hasData[index] ? 5 : 0,
                strokeWidth: 2,
                stroke: '#FFFFFF',
                fill: getChartData().hasData[index] ? '#5B9BD5' : 'transparent',
              })}
            />
              </View>

          {spouseConnected && (
            <View style={styles.scoreCards}>
              <View style={styles.scoreCard}>
                <View style={styles.scoreHeader}>
                  <Ionicons name="person" size={16} color="#5B9BD5" />
                  <DefaultText style={styles.scoreTitle}>나의 평균</DefaultText>
                </View>
                <DefaultText style={styles.scoreValue}>좋음</DefaultText>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreProgress, { width: '70%', backgroundColor: '#5B9BD5' }]} />
                </View>
                <DefaultText style={styles.scoreNumber}>3.9/5</DefaultText>
          </View>

              <View style={styles.scoreCard}>
                <View style={styles.scoreHeader}>
                  <Ionicons name="heart" size={16} color="#ED7D95" />
                  <DefaultText style={styles.scoreTitle}>배우자 평균</DefaultText>
              </View>
                <DefaultText style={styles.scoreValue}>좋음</DefaultText>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreProgress, { width: '82%', backgroundColor: '#ED7D95' }]} />
                </View>
                <DefaultText style={styles.scoreNumber}>4.1/5</DefaultText>
              </View>
            </View>
          )}
        </View>

        {/* 통계 카드 - 상하 2개로 */}
        <View style={styles.statsContainer}>
          {spouseConnected && (
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <Ionicons name="heart-outline" size={18} color="#E91E63" />
                <DefaultText style={styles.statLabel}>부부 동조율</DefaultText>
              </View>
              <View style={styles.statRight}>
                <DefaultText style={styles.statPercent}>{syncPercent}%</DefaultText>
                <View style={styles.statBar}>
                  <View style={[styles.statFill, { width: `${syncPercent}%`, backgroundColor: '#FFB3C1' }]} />
                </View>
              </View>
            </View>
          )}

          <View style={[styles.statRow, !spouseConnected && { marginTop: 0 }]}>
            <View style={styles.statLeft}>
              <Ionicons name="document-text-outline" size={18} color="#666" />
              <View>
                <DefaultText style={styles.statLabel}>주간 레포트</DefaultText>
                <DefaultText style={styles.statHelper}>주 4일 이상 기록시 발행</DefaultText>
              </View>
            </View>
            <View style={styles.statRight}>
              <DefaultText style={styles.statCount}>{weekly.length}/4일</DefaultText>
              <View style={styles.statBar}>
                <View style={[styles.statFill, { width: weekly.length >= 4 ? '100%' : `${Math.min((weekly.length / 4) * 100, 100)}%`, backgroundColor: weekly.length >= 4 ? '#95D5B2' : '#FFD6A5' }]} />
              </View>
              {weekly.length >= 4 && (
                <DefaultText style={styles.statReady}>✓ 일요일 수령</DefaultText>
              )}
            </View>
          </View>
        </View>

        {/* 이번 주 레포트 카드 (길게 누르면 생성) */}
        <TouchableOpacity
          style={styles.insightCard}
          onPress={() => router.push('/reports' as any)}
          onLongPress={async () => {
            try {
              Alert.alert('레포트 생성', '지난 7일 데이터를 바탕으로 레포트를 생성합니다.');
              const { reportId } = await generateWeeklyReport({ openAfter: true });
              router.push(`/reports/${reportId}` as any);
            } catch (e) {
              console.error(e);
              Alert.alert('생성 실패', '레포트 생성 중 문제가 발생했어요. 다시 시도해주세요.');
            }
          }}
          delayLongPress={600}
          activeOpacity={0.8}
        >
          <View style={styles.insightHeader}>
            <Ionicons name="analytics" size={20} color="#FFB800" />
            <DefaultText style={styles.insightTitle}>이번 주 레포트</DefaultText>
          </View>
          <DefaultText style={styles.insightText}>
            {weekly.length >= 3
              ? `${weekly.length}일의 기록을 바탕으로 분석이 준비되었습니다.`
              : `아직 데이터가 부족해요. ${Math.max(3 - weekly.length, 0)}일만 더 기록해주세요.`}
          </DefaultText>
        </TouchableOpacity>

        {/* 이번 주 인사이트 카드 (맨 아래) */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="bulb-outline" size={20} color="#FFB800" />
            <DefaultText style={styles.insightTitle}>이번 주 인사이트</DefaultText>
          </View>

          {getEmotionPattern() && (
            <View style={[styles.insightItem, styles.insightPurple]}>
              <DefaultText style={styles.insightLabel}>패턴 분석</DefaultText>
              <DefaultText style={styles.insightText}>{getEmotionPattern()}</DefaultText>
            </View>
          )}

          {getUnusualPoint() && (
            <View style={[styles.insightItem, styles.insightOrange]}>
              <DefaultText style={styles.insightLabel}>주목할 점</DefaultText>
              <DefaultText style={styles.insightText}>{getUnusualPoint()}</DefaultText>
            </View>
          )}

          {spouseConnected && getCoupleSync() && (
            <View style={[styles.insightItem, styles.insightPink]}>
              <DefaultText style={styles.insightLabel}>관계 동향</DefaultText>
              <DefaultText style={styles.insightText}>{getCoupleSync()}</DefaultText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 바텀시트: 미리보기 */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <DefaultText style={styles.modalTitle}>{modalDate}</DefaultText>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
        </TouchableOpacity>
            </View>

            {modalLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* 감정 표시 */}
                <View style={styles.modalSection}>
                  <DefaultText style={styles.modalSectionTitle}>감정</DefaultText>
                  <View style={styles.emotionChips}>
                    {modalEmotions.map((emo) => (
                      <View key={emo} style={styles.modalEmotionChip}>
                        <Text style={styles.modalEmoji}>{EMOJI[emo]}</Text>
                        <DefaultText style={styles.modalEmotionText}>
                          {emo === "great" ? "매우 좋음" : emo === "good" ? "좋음" : emo === "neutral" ? "보통" : emo === "bad" ? "나쁨" : "매우 나쁨"}
                        </DefaultText>
                      </View>
                    ))}
                    {modalEmotions.length === 0 && (
                      <DefaultText style={styles.noDataText}>기록 없음</DefaultText>
                    )}
                  </View>
                </View>

                {/* 대화 여부 */}
                <View style={styles.modalSection}>
                  <DefaultText style={styles.modalSectionTitle}>배우자와 대화</DefaultText>
                  <View style={styles.modalConversation}>
                    {modalConversation === true && (
                      <View style={styles.conversationBadge}>
                        <Ionicons name="chatbubbles" size={20} color="#4CAF50" />
                        <DefaultText style={styles.conversationText}>대화함</DefaultText>
                      </View>
                    )}
                    {modalConversation === false && (
                      <View style={[styles.conversationBadge, { backgroundColor: '#FFE5E5' }] }>
                        <Ionicons name="chatbubbles-outline" size={20} color="#FF6B6B" />
                        <DefaultText style={[styles.conversationText, { color: '#FF6B6B' }]}>대화 안 함</DefaultText>
                      </View>
                    )}
                    {modalConversation === null && (
                      <DefaultText style={styles.noDataText}>기록 없음</DefaultText>
                    )}
                  </View>
                </View>

                {/* 목표 달성 */}
                <View style={styles.modalSection}>
                  <DefaultText style={styles.modalSectionTitle}>관계 목표</DefaultText>
                  <View style={styles.goalsList}>
                    {Object.entries(modalGoals).filter(([_, v]) => v).map(([key]) => (
                      <View key={key} style={styles.goalBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <DefaultText style={styles.goalText}>
                          {key === 'conversation10min' ? '10분 대화' : key === 'gratitudeShare' ? '감사 표현' : key === 'dateActivity' ? '함께 활동' : '스킨십'}
                        </DefaultText>
                      </View>
                    ))}
                    {Object.values(modalGoals).every(v => !v) && (
                      <DefaultText style={styles.noDataText}>달성 목표 없음</DefaultText>
                    )}
                  </View>
                </View>

                {/* 한줄일기 추가 */}
                <View style={styles.modalSection}>
                  <DefaultText style={styles.modalSectionTitle}>한줄일기</DefaultText>
                  {modalText ? (
                    <View style={styles.diaryBox}>
                      <DefaultText style={styles.diaryText}>{modalText}</DefaultText>
                    </View>
                  ) : (
                    <DefaultText style={styles.noDataText}>작성된 일기가 없습니다</DefaultText>
                  )}
                </View>

                {/* 수정 버튼 하나만 */}
                <TouchableOpacity
                  style={styles.modalEditBtn}
                  onPress={() => {
                    setShowModal(false);
                    router.push({ pathname: "/diary/[date]", params: { date: modalDate } as any });
                  }}
                >
                  <Ionicons name="pencil" size={18} color="#FFFFFF" />
                  <DefaultText style={styles.modalEditText}>수정하기</DefaultText>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

/* ============================ Styles ============================ */
const { width: W } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFBFC" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEF",
  },
  monthSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  monthArrow: { padding: 4 },
  topActions: { flexDirection: "row", gap: 16 },
  actionButton: { alignItems: 'center', padding: 4 },
  actionLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  scrollContent: { paddingBottom: 120 },

  checkIn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    margin: 16,
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#4A90E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  checkInDone: { borderColor: "#40C057", backgroundColor: "#F3FAF3" },
  checkInLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  checkInTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  checkInSub: { fontSize: 13, color: "#8A94A6", marginTop: 2 },

  calendar: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  yAxisLabels: {
    position: 'absolute',
    left: 5,
    top: 30,
    bottom: 30,
    justifyContent: 'space-between',
  },
  yLabel: {
    fontSize: 10,
    color: '#6B7280',
    width: 45,
    textAlign: 'right',
  },
  chartTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  chartContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  yAxisContainer: { justifyContent: 'space-between', height: 180, width: 80, paddingVertical: 10 },
  yAxisText: { fontSize: 12, color: '#333', fontWeight: '500', backgroundColor: '#FFFFFF', paddingHorizontal: 2 },
  yAxisItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  yAxisDot: { width: 6, height: 6, borderRadius: 3 },
  yAxisLabel: { fontSize: 12, color: '#333', fontWeight: '500' },
  emotionScale: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  emotionDot: { width: 12, height: 12, borderRadius: 6 },
  emotionLabels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  emotionLabel: { fontSize: 10, color: '#999' },
  scoreCards: { flexDirection: 'row', gap: 12, marginTop: 20 },
  scoreCard: { flex: 1, backgroundColor: '#F8F9FA', padding: 15, borderRadius: 15 },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreTitle: { fontSize: 12, color: '#666' },
  scoreValue: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 8 },
  scoreBar: { height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, marginTop: 8 },
  scoreProgress: { height: '100%', borderRadius: 3 },
  scoreNumber: { fontSize: 11, color: '#999', marginTop: 6 },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  legendItem: { alignItems: "center", gap: 4 },
  legendText: { fontSize: 11, color: "#6B7280" },
  syncRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  syncBox: { flex: 1, backgroundColor: "#F7F8FA", padding: 12, borderRadius: 12, alignItems: "center" },
  syncLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  syncValue: { fontSize: 18, fontWeight: "700", color: "#111" },
  weekHeader: {
    flexDirection: "row",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  weekDayCell: { flex: 1, alignItems: "center" },
  weekDayText: { fontSize: 12, fontWeight: "600", color: "#8A94A6" },
  week: { flexDirection: "row", marginBottom: 6 },
  emptyDay: { flex: 1, height: 50 },
  dayCell: {
    flex: 1,
    height: 56,
    marginHorizontal: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "#FFFFFF",
    paddingVertical: 4,
  },
  todayCell: { backgroundColor: '#E3F2FD', borderWidth: 1.5, borderColor: '#4A90E2' },
  dayNum: { fontSize: 14, fontWeight: "600", color: "#333333", marginBottom: 2 },
  sundayNum: { color: '#F44336' },
  saturdayNum: { color: '#2196F3' },
  todayNum: { fontWeight: '700', color: '#1976D2' },
  dayEmoji: { fontSize: 14, position: 'absolute', bottom: 4 },
  todaySoft: { backgroundColor: "#F0F8FF", borderWidth: 0 },
  todayDot: {
    position: "absolute",
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
  },

  emojiCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  emojiCardTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 10 },
  emojiRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  emojiCell: {
    width: (W - 16 * 2 - 8 * 6) / 7,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBig: { fontSize: 20 },
  emojiLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },

  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  statRight: { alignItems: 'flex-end', flex: 1, maxWidth: 120 },
  statPercent: { fontSize: 14, fontWeight: '600', color: '#E91E63', marginBottom: 4 },
  statStatus: { fontSize: 13, fontWeight: '400', color: '#666', marginBottom: 4 },
  statHelper: { fontSize: 11, color: '#999' },
  statCount: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  statReady: { fontSize: 11, color: '#2E7D32', marginTop: 4 },
  statFill: { height: '100%', borderRadius: 3 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statIconWrapper: { marginBottom: 8 },
  statTitle: { fontSize: 13, fontWeight: '500', color: '#666', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  statBar: { width: '100%', height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  statProgress: { height: '100%', borderRadius: 4 },
  reportStatusText: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginTop: 8 },
  reportSubText: { fontSize: 11, color: '#666', marginTop: 4 },
  reportProgressBar: { height: 6, backgroundColor: '#FFE5B4', borderRadius: 3, marginTop: 8, marginBottom: 4 },
  reportProgressFill: { height: '100%', backgroundColor: '#FFB800', borderRadius: 3 },
  insightCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  insightTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.3 },
  insightItem: { padding: 14, borderRadius: 14, marginBottom: 12 },
  insightPink: { backgroundColor: '#FFE5EC' },
  insightPurple: { backgroundColor: '#F0E8FF' },
  insightOrange: { backgroundColor: '#FFF0E0' },
  insightGreen: { backgroundColor: '#E8F5E9' },
  insightBlue: { backgroundColor: '#E3F2FD' },
  insightYellow: { backgroundColor: '#FFF9E6' },
  insightLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 6, letterSpacing: -0.2 },
  insightText: { fontSize: 14, color: '#555', lineHeight: 20, letterSpacing: -0.1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: "82%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  loadingBox: { padding: 24, alignItems: "center" },

  emotionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFF",
  },

  previewBox: { marginTop: 12, marginHorizontal: 16, padding: 14, backgroundColor: "#F7F8FA", borderRadius: 12 },
  previewText: { fontSize: 15, color: "#111", lineHeight: 22 },
  modalSection: { paddingHorizontal: 20, paddingVertical: 12 },
  modalSectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  modalEmotionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  modalEmoji: { fontSize: 18, marginRight: 4 },
  modalEmotionText: { fontSize: 13, color: '#333' },
  modalConversation: { flexDirection: 'row', gap: 8 },
  conversationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  conversationText: { marginLeft: 6, fontSize: 13, color: '#4CAF50' },
  goalsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  goalText: { fontSize: 12, marginLeft: 4, color: '#333' },
  noDataText: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  diaryScroll: { maxHeight: 100, backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12 },
  diaryBox: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8 },
  diaryText: { fontSize: 14, color: '#333', lineHeight: 20 },
  editButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#4A90E2', marginHorizontal: 20, marginVertical: 16, paddingVertical: 12, borderRadius: 12 },
  editButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginLeft: 6 },

  editor: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: "#FFF",
    fontSize: 15,
    lineHeight: 22,
  },

  modalActions: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  primaryBtn: { backgroundColor: "#4A90E2", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: "#FFF", fontWeight: "700" },
  secondaryBtn: { backgroundColor: "#EEF2F7", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  secondaryBtnText: { color: "#111", fontWeight: "600" },
  modalEditBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#4A90E2', marginHorizontal: 16, marginTop: 20, marginBottom: 16, paddingVertical: 14, borderRadius: 12, gap: 8 },
  modalEditText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
