// app/calendar.tsx - 감정 표시 개선 버전 (배경색 + 테두리)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import DefaultText from "../components/DefaultText";
import SpouseStatusBar from '../components/SpouseStatusBar';
import MonthPicker from '../components/MonthPicker';
import ImprovedEmotionChart from '../components/components/ImprovedEmotionChart';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 폴 에크만의 6가지 기본 감정 - 일기 작성 페이지와 일치
const BASIC_EMOTIONS: Array<{
  id: string;
  label: string;
  color: string;
  bgColor: string;
  lightBg: string; // 캘린더 배경용 더 연한 색상
}> = [
  { 
    id: 'joy', 
    label: '기쁨', 
    color: '#FFD700',
    bgColor: '#FFF7CC',
    lightBg: '#FFFBE6'
  },
  { 
    id: 'sadness', 
    label: '슬픔', 
    color: '#4169E1',
    bgColor: '#E8ECFF',
    lightBg: '#F5F7FF'
  },
  { 
    id: 'anger', 
    label: '분노', 
    color: '#DC143C',
    bgColor: '#FFE6EC',
    lightBg: '#FFF2F5'
  },
  { 
    id: 'fear', 
    label: '두려움', 
    color: '#8A2BE2',
    bgColor: '#F0E6FF',
    lightBg: '#F7F0FF'
  },
  { 
    id: 'surprise', 
    label: '놀람', 
    color: '#FF8C00',
    bgColor: '#FFECD6',
    lightBg: '#FFF5E6'
  },
  { 
    id: 'disgust', 
    label: '혐오', 
    color: '#32CD32',
    bgColor: '#E6FFE6',
    lightBg: '#F2FFF2'
  }
];

// 요일 변환 함수
function getKoreanDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayIndex = date.getDay();
  return days[dayIndex] || '일';
}

// 날짜 포맷팅 함수 (표시용)
function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  if (!month || !day) return dateStr;
  const dayOfWeek = getKoreanDayOfWeek(dateStr);
  return `${parseInt(month)}월 ${parseInt(day)}일 (${dayOfWeek})`;
}

// 주요 감정 추출 함수
function getPrimaryEmotion(emotions: string[]): typeof BASIC_EMOTIONS[0] | null {
  if (!emotions || emotions.length === 0) return null;
  
  // 첫 번째 감정을 주요 감정으로 사용
  const primaryEmotionId = emotions[0];
  return BASIC_EMOTIONS.find(e => e.id === primaryEmotionId) || null;
}

interface CalendarDiaryData {
  text: string;
  emotions?: string[];
  emotionStickers?: string[];
  date: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [diaryDates, setDiaryDates] = useState<string[]>([]);
  const [diarySnippets, setDiarySnippets] = useState<{ [date: string]: string }>({});
  const [diaryEmotions, setDiaryEmotions] = useState<{ [date: string]: string[] }>({});
  const [spouseEmotions, setSpouseEmotions] = useState<{ [date: string]: string[] }>({});
  const [spouseConnected, setSpouseConnected] = useState(false);
  const [weeklyDiaryData, setWeeklyDiaryData] = useState<CalendarDiaryData[]>([]);

  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(false);

  // 모달 관련 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDiaryContent, setSelectedDiaryContent] = useState<string>("");
  const [selectedDiaryDate, setSelectedDiaryDate] = useState<string>("");
  const [selectedDiaryEmotions, setSelectedDiaryEmotions] = useState<string[]>([]);
  const [displayMonth, setDisplayMonth] = useState(new Date());

  // 애니메이션 값
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 주간 일기 데이터 로드 (감정 차트용)
  const loadWeeklyDiaryData = async () => {
    if (!auth.currentUser) return;
    
    try {
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      
      const startDateStr = sevenDaysAgo.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];
      
      const diariesRef = collection(db, "diaries");
      const q = query(
        diariesRef,
        where("userId", "==", auth.currentUser.uid),
        where("date", ">=", startDateStr),
        where("date", "<=", endDateStr)
      );
      
      const querySnapshot = await getDocs(q);
      const weekData: CalendarDiaryData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        if (data?.date && data?.text) {
          const dateStr = String(data.date);
          const emotionArr = Array.isArray(data.emotions)
            ? data.emotions
            : Array.isArray(data.emotionStickers)
              ? data.emotionStickers
              : [];
          weekData.push({
            date: dateStr,
            text: String(data.text),
            emotions: emotionArr,
          });
        }
      });
      
      setWeeklyDiaryData(weekData);
    } catch (error) {
      console.error("주간 다이어리 데이터 로드 오류:", error);
    }
  };

  // 실제 통계 계산 함수
  const calculateRealStats = () => {
    const totalDays = diaryDates.length;
    
    // 실제 배우자 연결일 계산
    const connectedDays = diaryDates.filter(date => 
      (spouseEmotions[date]?.length ?? 0) > 0
    ).length;
    const connectionRate = totalDays > 0 ? Math.round((connectedDays / totalDays) * 100) : 0;
    
    // 연속 기록일 계산
    let consecutiveDays = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0] || "";
      
      if (diaryDates && diaryDates.includes(dateStr)) {
        consecutiveDays++;
      } else {
        break;
      }
    }
    
    // 최근 7일 기록률
    const recentWeekDays = 7;
    let recentRecords = 0;
    for (let i = 0; i < recentWeekDays; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0] || "";
      
      if (diaryDates.includes(dateStr)) {
        recentRecords++;
      }
    }
    const weeklyRate = Math.round((recentRecords / recentWeekDays) * 100);
    
    return { 
      connectionRate, 
      totalDays, 
      consecutiveDays, 
      weeklyRate,
      recentRecords 
    };
  };

  // 요청 수 확인 함수
  const checkPendingRequests = async () => {
    if (!auth.currentUser) return;
    
    try {
      const q = query(
        collection(db, 'spouseRequests'),
        where('recipientId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      setPendingRequests(snapshot.size);
    } catch (error) {
      console.error('요청 확인 오류:', error);
    }
  };

  // 배우자 연결 상태 확인
  const checkSpouseConnection = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSpouseConnected(!!userData.spouseId);
      }
    } catch (error) {
      console.error('배우자 연결 상태 확인 오류:', error);
    }
  };

  useEffect(() => {
    checkPendingRequests();
    checkSpouseConnection();
    loadWeeklyDiaryData();
    
    // 페이드인 애니메이션
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // 주간 다이어리 기능 추가
  const handleWeeklyDiaryPress = () => {
    router.push('/screens/WeeklyDiaryScreen' as any);
  };

  // 모달 열기
  const openModal = () => {
    setModalVisible(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setModalVisible(false);
    setSelectedDiaryContent("");
    setSelectedDiaryDate("");
    setSelectedDiaryEmotions([]);
  };

  // 다이어리 페이지로 직접 이동
  const directNavigate = () => {
    if (selectedDiaryDate) {
      closeModal();
      router.push(`/diary/${selectedDiaryDate}` as any);
    }
  };

  // 다이어리 쓰기 핸들러
  const handleDiaryWrite = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dateParam = `${year}-${month}-${day}`;
    
    router.push(`/diary/${dateParam}` as any);
  };

  // 사용자의 다이어리 날짜, 스니펫, 감정 로드
  useEffect(() => {
    const fetchDiaryData = async () => {
      if (!auth.currentUser) return;
      
      setLoading(true);

      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        
        const startDateStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const endDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;
        
        const diariesRef = collection(db, "diaries");
        const q = query(
          diariesRef,
          where("userId", "==", auth.currentUser.uid),
          where("date", ">=", startDateStr),
          where("date", "<=", endDateStr)
        );
        
        const querySnapshot = await getDocs(q);
        const dates: string[] = [];
        const snippets: { [date: string]: string } = {};
        const emotions: { [date: string]: string[] } = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            dates.push(data.date);
            
            if (data.text) {
              const snippet = data.text.substring(0, 15) + (data.text.length > 15 ? "..." : "");
              snippets[data.date] = snippet;
            }
            
            // 감정 데이터 처리 개선
            let emotionArray: string[] = [];
            
            // 새로운 emotion 필드 확인
            if (data.emotion && typeof data.emotion === 'string') {
              emotionArray = [data.emotion];
            }
            // emotions 배열 확인  
            else if (data.emotions && Array.isArray(data.emotions)) {
              emotionArray = data.emotions;
            } 
            // 레거시 emotionStickers 배열 확인
            else if (data.emotionStickers && Array.isArray(data.emotionStickers)) {
              emotionArray = data.emotionStickers;
            }
            
            if (emotionArray.length > 0) {
              emotions[data.date] = emotionArray;
              console.log(`감정 데이터 로드됨 - 날짜: ${data.date}, 감정: ${emotionArray.join(', ')}`);
            }
          }
        });
        
        setDiaryDates(dates);
        setDiarySnippets(snippets);
        setDiaryEmotions(emotions);
        
        // 주간 데이터도 다시 로드
        loadWeeklyDiaryData();
      } catch (error) {
        console.error("다이어리 데이터 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDiaryData();
  }, [currentMonth]);

  // 날짜 클릭 핸들러
  const handleDatePress = async (date: Date) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedDate(date);
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateParam = `${year}-${month}-${day}`;
    
    if (auth.currentUser) {
      try {
        const paddedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const diaryRef = doc(db, "diaries", `${auth.currentUser.uid}_${paddedDate}`);
        const diarySnap = await getDoc(diaryRef);
        
        if (diarySnap.exists()) {
          const data = diarySnap.data();
          setSelectedDiaryContent(data.text || "");
          setSelectedDiaryDate(dateParam);
          setSelectedDiaryEmotions(data.emotions || data.emotionStickers || []);
          openModal();
        } else {
          router.push(`/diary/${dateParam}` as any);
        }
      } catch (error) {
        console.error("다이어리 내용 로드 오류:", error);
        router.push(`/diary/${dateParam}` as any);
      }
    } else {
      router.push(`/diary/${dateParam}` as any);
    }
  };

  const stats = calculateRealStats();

  // 달력 렌더링 로직
  const renderCalendarForMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const today = new Date();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    type CalendarDay = {
      date: Date;
      currentMonth: boolean;
    };
    
    const daysArray: CalendarDay[] = [];
    
    // 전월 날짜 채우기
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevMonthDate = new Date(year, month, 0 - i);
      daysArray.unshift({
        date: prevMonthDate,
        currentMonth: false,
      });
    }
    
    // 현재 월 날짜 채우기
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const currentDate = new Date(year, month, i);
      daysArray.push({
        date: currentDate,
        currentMonth: true,
      });
    }
    
    // 다음 달 날짜 채우기
    const remainingDays = 42 - daysArray.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      daysArray.push({
        date: nextMonthDate,
        currentMonth: false,
      });
    }
    
    // 7일씩 그룹화
    const calendarWeeks: CalendarDay[][] = [];
    for (let i = 0; i < 6; i++) {
      calendarWeeks.push(daysArray.slice(i * 7, (i + 1) * 7));
    }

    return (
      <View style={styles.calendarCard}>
        {/* 요일 헤더 */}
        <View style={styles.weekHeader}>
          {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => (
            <View key={idx} style={styles.weekDay}>
              <DefaultText 
                style={[
                  styles.weekDayText, 
                  idx === 0 ? styles.sundayText : null,
                  idx === 6 ? styles.saturdayText : null
                ]}
              >
                {dayName}
              </DefaultText>
            </View>
          ))}
        </View>
        
        {/* 달력 날짜 */}
        {calendarWeeks.map((calendarWeek: CalendarDay[], weekIdx: number) => (
          <View key={weekIdx} style={styles.week}>
            {calendarWeek.map((calendarDay: CalendarDay, dayIdx: number) => {
              const dateStr = `${calendarDay.date.getFullYear()}-${String(calendarDay.date.getMonth() + 1).padStart(2, "0")}-${String(calendarDay.date.getDate()).padStart(2, "0")}`;
              const hasDiary = diaryDates.includes(dateStr);
              const emotions = diaryEmotions[dateStr] || [];
              const hasSpouseData = spouseEmotions[dateStr] && spouseEmotions[dateStr].length > 0;
              const isToday = calendarDay.date.toDateString() === today.toDateString();
              
              // 주요 감정 추출
              const primaryEmotion = getPrimaryEmotion(emotions);
              
              // 동적 스타일 계산
              const dayStyle = [
                styles.day,
                !calendarDay.currentMonth ? styles.otherMonthDay : null,
                isToday && styles.todayDay,
                // 감정에 따른 배경색과 테두리 추가
                hasDiary && primaryEmotion && {
                  backgroundColor: primaryEmotion.lightBg,
                  borderWidth: 2,
                  borderColor: primaryEmotion.color + '40', // 투명도 40%
                },
              ];

              const textStyle = [
                styles.dayText,
                !calendarDay.currentMonth ? styles.otherMonthDayText : null,
                dayIdx === 0 ? styles.sundayTextDate : null,
                dayIdx === 6 ? styles.saturdayTextDate : null,
                isToday && styles.todayText,
                // 감정에 따른 텍스트 색상 변경
                hasDiary && primaryEmotion && {
                  color: primaryEmotion.color,
                  fontWeight: '700' as const,
                },
              ];
              
              return (
                <TouchableOpacity
                  key={dayIdx}
                  style={dayStyle}
                  onPress={() => handleDatePress(calendarDay.date)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayContent}>
                    <DefaultText style={textStyle}>
                      {calendarDay.date.getDate()}
                    </DefaultText>
                    
                    {/* 배우자 연결 표시 */}
                    {hasSpouseData && (
                      <View style={styles.spouseIndicator} />
                    )}
                    
                    {/* 감정 수 표시 (작은 뱃지) */}
                    {hasDiary && emotions.length > 1 && (
                      <View style={[styles.emotionCountBadge, { backgroundColor: primaryEmotion?.color || '#8A94A6' }]}>
                        <DefaultText style={styles.emotionCountText}>
                          {emotions.length}
                        </DefaultText>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Ionicons name="heart" size={24} color="#FFFFFF" />
            </View>
            <View>
              <DefaultText style={styles.appName}>토닥토닥</DefaultText>
              <DefaultText style={styles.appSubtitle}>전문 심리상담 기반 부부 케어</DefaultText>
            </View>
          </View>
          <View style={styles.headerActions}>
            {spouseConnected && (
              <View style={styles.connectionStatus}>
                <View style={styles.connectionDot} />
                <DefaultText style={styles.connectionText}>연결됨</DefaultText>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/reports' as any)} style={styles.iconButton}>
              <Ionicons name="bar-chart" size={22} color="#111518" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile' as any)} style={styles.iconButton}>
              <Ionicons name="person-circle" size={26} color="#111518" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 캘린더 헤더 */}
        <View style={styles.calendarHeader}>
          <MonthPicker 
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        </View>
        
        {/* 캘린더 */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <DefaultText style={styles.loadingText}>불러오는 중...</DefaultText>
          </View>
        ) : (
          renderCalendarForMonth(currentMonth)
        )}

        {/* 범례 (캘린더 아래, 한 줄 고정 표시) */}
        <View style={styles.legendContainer}>
          <DefaultText style={styles.legendTitle}>감정 유형</DefaultText>
          <View style={styles.legendRow}>
            {BASIC_EMOTIONS.map((emotion) => (
              <View key={emotion.id} style={styles.legendItemSimple}> 
                <View style={[styles.legendDot, { backgroundColor: emotion.color }]} />
                <DefaultText style={styles.legendLabel} numberOfLines={1}>
                  {emotion.label}
                </DefaultText>
              </View>
            ))}
          </View>
        </View>


        {/* 신뢰도 기반 감정 차트 */}
        <ImprovedEmotionChart weekData={weeklyDiaryData} />

        {/* 통계 카드 */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.8} onPress={() => router.push('/diary' as any)}>
            <View style={styles.statHeader}>
              <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
              <DefaultText style={styles.statLabel}>최근 7일</DefaultText>
            </View>
            <DefaultText style={styles.statValue}>{stats.weeklyRate}%</DefaultText>
            <DefaultText style={styles.statDescription}>기록률</DefaultText>
            <DefaultText style={styles.statDetail}>
              {stats.recentRecords}/7일 기록
            </DefaultText>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${stats.weeklyRate}%`, backgroundColor: '#4CAF50' }]}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="flame" size={20} color="#FF9800" />
              <DefaultText style={styles.statLabel}>연속</DefaultText>
            </View>
            <DefaultText style={styles.statValue}>{stats.consecutiveDays}일</DefaultText>
            <DefaultText style={styles.statDescription}>기록 중</DefaultText>
            <DefaultText style={styles.statDetail}>
              {stats.consecutiveDays > 0 ? '대단해요! 💪' : '시작해보세요 ✨'}
            </DefaultText>
          </View>

          {spouseConnected && (
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="people" size={20} color="#E91E63" />
                <DefaultText style={styles.statLabel}>부부</DefaultText>
              </View>
              <DefaultText style={styles.statValue}>{stats.connectionRate}%</DefaultText>
              <DefaultText style={styles.statDescription}>동시 기록률</DefaultText>
              <DefaultText style={styles.statDetail}>
                함께 성장하고 있어요 ❤️
              </DefaultText>
            </View>
          )}
        </View>

        {/* AI 인사이트 카드 */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={styles.insightIcon}>
              <Ionicons name="analytics" size={20} color="#4A90E2" />
            </View>
            <DefaultText style={styles.insightTitle}>주간 감정 인사이트</DefaultText>
          </View>
          
          {weeklyDiaryData.length >= 3 ? (
            <>
              <DefaultText style={styles.insightContent}>
                최근 <DefaultText style={styles.insightHighlight}>{weeklyDiaryData.length}일</DefaultText> 기록을 바탕으로 
                감정 패턴을 분석했습니다. {stats.consecutiveDays > 0 && 
                `${stats.consecutiveDays}일 연속 기록으로 꾸준한 관리를 보여주고 있어요. `}
                더 정확한 분석을 위해 일주일에 5일 이상 기록하는 것을 권장합니다.
              </DefaultText>
              <TouchableOpacity 
                style={styles.insightButton}
                onPress={handleWeeklyDiaryPress}
              >
                <DefaultText style={styles.insightButtonText}>
                  상세 분석 보기 →
                </DefaultText>
              </TouchableOpacity>
            </>
          ) : (
            <DefaultText style={styles.insightContent}>
              아직 분석할 데이터가 부족합니다. 
              <DefaultText style={styles.insightHighlight}> 3일 이상</DefaultText> 꾸준히 기록하시면 
              개인화된 감정 패턴 분석을 제공해드릴 수 있어요.
            </DefaultText>
          )}
        </View>
      </ScrollView>

      {/* 플로팅 액션 버튼 */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleDiaryWrite}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 바텀 시트 */}
      {modalVisible && (
        <View style={styles.simpleBottomSheet}>
          <View style={styles.simpleHeader}>
            <DefaultText style={styles.simpleDateText}>
              {selectedDiaryDate && formatDisplayDate(selectedDiaryDate.replace(/(\d+)-(\d+)-(\d+)/, '$1-$2-$3'))}
            </DefaultText>
            <TouchableOpacity onPress={closeModal} style={styles.simpleCloseButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedDiaryEmotions.length > 0 && (
            <View style={styles.simpleEmotionsSection}>
              <DefaultText style={styles.simpleEmotionsTitle}>오늘의 감정</DefaultText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedDiaryEmotions.map(emotionId => {
                  const emotion = BASIC_EMOTIONS.find(e => e.id === emotionId);
                  return emotion ? (
                    <View key={emotionId} style={[styles.simpleEmotionTag, { backgroundColor: emotion.bgColor }]}>
                      <View style={[styles.emotionTagDot, { backgroundColor: emotion.color }]} />
                      <DefaultText style={styles.simpleEmotionLabel}>{emotion.label}</DefaultText>
                    </View>
                  ) : null;
                })}
              </ScrollView>
            </View>
          )}

          <ScrollView style={styles.simpleContentScroll} showsVerticalScrollIndicator={true}>
            <DefaultText style={styles.simpleDiaryContent}>
              {selectedDiaryContent}
            </DefaultText>
          </ScrollView>

          <View style={styles.simpleFooter}>
            <TouchableOpacity style={styles.simpleEditButton} onPress={directNavigate}>
              <Ionicons name="create" size={16} color="#FFFFFF" />
              <DefaultText style={styles.simpleEditButtonText}>수정하기</DefaultText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // 헤더 스타일
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#8A94A6',
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  connectionDot: {
    width: 6,
    height: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 3,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },

  // 캘린더 스타일
  calendarHeader: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  monthSubtitle: {
    fontSize: 13,
    color: '#8A94A6',
    marginTop: 8,
    fontWeight: '500',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontWeight: "600",
    color: '#4E5969',
    fontSize: 13,
  },
  week: {
    flexDirection: "row",
    marginBottom: 8,
    height: 56,
  },
  day: {
    flex: 1,
    height: 56,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  todayDay: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
    borderWidth: 2,
  },
  todayText: {
    color: '#1976D2',
    fontWeight: '700',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthDayText: {
    color: "#BCC2CE",
  },
  sundayText: {
    color: "#F44336",
  },
  saturdayText: {
    color: "#2196F3",
  },
  sundayTextDate: {
    color: "#EF5350",
  },
  saturdayTextDate: {
    color: "#42A5F5",
  },
  
  // 개선된 감정 표시 스타일
  spouseIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 4,
    height: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  emotionCountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionCountText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // 개선된 범례 스타일
  legendContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  legendItemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  legendItemsHorizontal: {
    paddingRight: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendItemSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
    maxWidth: 56,
    textAlign: 'center',
  },

  // 통계 카드
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#8A94A6',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 13,
    color: '#4E5969',
    marginBottom: 4,
  },
  statDetail: {
    fontSize: 10,
    color: '#8A94A6',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0F2F5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // AI 인사이트 카드
  insightCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    backgroundColor: '#F0F7FF',
    borderRadius: 20, 
    borderWidth: 1,
    borderColor: '#D0E4FF',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  insightContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4E5969',
  },
  insightHighlight: {
    fontWeight: '700',
    color: '#4A90E2',
  },
  insightButton: {
    marginTop: 12,
  },
  insightButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },

  // 플로팅 액션 버튼
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: '#4A90E2',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // 로딩
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8A94A6',
    fontSize: 14,
  },

  // 바텀시트
  simpleBottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    maxHeight: '80%',
    minHeight: 200,
  },
  simpleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  simpleDateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  simpleCloseButton: {
    padding: 8,
  },
  simpleEmotionsSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  simpleEmotionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  simpleEmotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 6,
  },
  emotionTagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  simpleEmotionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  simpleContentScroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 16,
  },
  simpleDiaryContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1A1A1A',
    fontWeight: '400',
  },
  simpleFooter: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    backgroundColor: '#FFFFFF',
  },
  simpleEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
  },
  simpleEditButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});