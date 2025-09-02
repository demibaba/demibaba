// app/calendar.tsx - 원본 디자인 유지 버전
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import DefaultText from "../components/DefaultText";
import SpouseStatusBar from '../components/SpouseStatusBar';
import MonthPicker from '../components/MonthPicker';

// 감정 아이콘 컴포넌트들 (Ionicons 사용)
const JoyIcon = () => <Ionicons name="happy" size={16} color="#FFE5B4" />;
const SadnessIcon = () => <Ionicons name="sad" size={16} color="#B4D4E7" />;
const AngerIcon = () => <Ionicons name="flash" size={16} color="#FFB4B4" />;
const FearIcon = () => <Ionicons name="alert-circle" size={16} color="#E6D4FF" />;
const SurpriseIcon = () => <Ionicons name="star" size={16} color="#FFD4B4" />;
const DisgustIcon = () => <Ionicons name="close-circle" size={16} color="#D4D4D4" />;

// 아이콘 컴포넌트 타입 정의
type IconComponent = React.ComponentType<{}>;

// 폴 에크만의 6가지 기본 감정
const BASIC_EMOTIONS: Array<{
  id: string;
  icon: IconComponent;
  label: string;
  color: string;
}> = [
  { 
    id: 'joy', 
    icon: JoyIcon,
    label: '기쁨', 
    color: '#FFE5B4'
  },
  { 
    id: 'sadness', 
    icon: SadnessIcon,
    label: '슬픔', 
    color: '#B4D4E7'
  },
  { 
    id: 'anger', 
    icon: AngerIcon,
    label: '분노', 
    color: '#FFB4B4'
  },
  { 
    id: 'fear', 
    icon: FearIcon,
    label: '두려움', 
    color: '#E6D4FF'
  },
  { 
    id: 'surprise', 
    icon: SurpriseIcon,
    label: '놀람', 
    color: '#FFD4B4'
  },
  { 
    id: 'disgust', 
    icon: DisgustIcon,
    label: '혐오', 
    color: '#D4D4D4'
  }
];

// 요일 변환 함수
function getKoreanDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayIndex = date.getDay();
  return days[dayIndex] || '일'; // 기본값으로 '일' 반환
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

interface DiaryData {
  text: string;
  emotions?: string[];
  emotionStickers?: string[];
  date: string;
}

export default function CalendarPage() {
  console.log("📅 캘린더 컴포넌트 로드됨!");
  
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [diaryDates, setDiaryDates] = useState<string[]>([]);
  const [diarySnippets, setDiarySnippets] = useState<{ [date: string]: string }>({});
  const [diaryEmotions, setDiaryEmotions] = useState<{ [date: string]: string[] }>({});

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

  // 일주일치 다이어리 가져오기 버튼 핸들러
  const handleWeeklyDiaryPress = () => {
    router.push('/reports' as any);
  };

  // 프로필 페이지 이동 핸들러
  const handleProfilePage = () => {
    router.push('/profile' as any);
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

  // 초기화 useEffect 추가
  useEffect(() => {
    setDisplayMonth(currentMonth);
  }, []);

  // 첫 로드 시 및 메뉴 열 때마다 확인
  useEffect(() => {
    console.log("📅 캘린더 마운트됨!");
    checkPendingRequests();
  }, []);

  // 모달 열기
  const openModal = () => {
    console.log("🔍 바텀시트 열기 시도");
    setModalVisible(true);
    console.log("🔍 modalVisible 상태:", true);
  };

  // 모달 닫기
  const closeModal = () => {
    console.log("🔍 바텀시트 닫기");
    setModalVisible(false);
    setSelectedDiaryContent("");
    setSelectedDiaryDate("");
    setSelectedDiaryEmotions([]);
  };

  // 다이어리 페이지로 직접 이동
  const directNavigate = () => {
    if (selectedDiaryDate) {
      closeModal();
      
      try {
        router.push(`/diary/${selectedDiaryDate}` as any);
      } catch (error) {
        console.error("페이지 이동 오류:", error);
        setTimeout(() => {
          router.push(`/diary/${selectedDiaryDate}` as any);
        }, 100);
      }
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
            
            // emotions와 emotionStickers 둘 다 체크
            if (data.emotions && Array.isArray(data.emotions)) {
              emotions[data.date] = data.emotions;
            } else if (data.emotionStickers && Array.isArray(data.emotionStickers)) {
              emotions[data.date] = data.emotionStickers;
            }
          }
        });
        
        setDiaryDates(dates);
        setDiarySnippets(snippets);
        setDiaryEmotions(emotions);
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
    // 애니메이션 실행
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
    
    // 1초 후 선택된 날짜 상태 초기화
    setTimeout(() => {
      setSelectedDate(new Date());
    }, 1000);
    
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

  // 스켈레톤 로더
  const CalendarSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[...Array(6)].map((_, weekIdx) => (
        <View key={weekIdx} style={styles.skeletonWeek}>
          {[...Array(7)].map((_, dayIdx) => (
            <View key={dayIdx} style={styles.skeletonDay} />
          ))}
        </View>
      ))}
    </View>
  );

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
      <View>
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
              const snippetText = diarySnippets[dateStr] || "";
              const emotions = diaryEmotions[dateStr] || [];
              const isToday = calendarDay.date.toDateString() === today.toDateString();
              
              return (
                <TouchableOpacity
                  key={dayIdx}
                  style={[
                    styles.day,
                    !calendarDay.currentMonth ? styles.otherMonthDay : null,
                    selectedDate && calendarDay.date.toDateString() === selectedDate.toDateString() ? styles.selectedDay : null,
                    isToday && styles.todayDay, // 오늘 날짜 스타일
                  ]}
                  onPress={() => handleDatePress(calendarDay.date)}
                >
                  <View style={styles.dayContent}>
                    <DefaultText
                      style={[
                        styles.dayText,
                        !calendarDay.currentMonth ? styles.otherMonthDayText : null,
                        dayIdx === 0 ? styles.sundayText : null,
                        dayIdx === 6 ? styles.saturdayText : null,
                      ]}
                    >
                      {calendarDay.date.getDate()}
                    </DefaultText>
                    
                    {/* 감정 그라데이션 선 */}
                    {hasDiary && emotions.length > 0 && (
                      <View style={styles.emotionLineContainer}>
                        <View style={styles.emotionLine}>
                          {emotions.slice(0, 3).map((emotionId, index) => {
                            const emotion = BASIC_EMOTIONS.find(e => e.id === emotionId);
                            return emotion ? (
                              <View 
                                key={emotionId}
                                style={[
                                  styles.emotionSegment,
                                  { backgroundColor: emotion.color },
                                  index === 0 && styles.firstSegment,
                                  index === emotions.slice(0, 3).length - 1 && styles.lastSegment
                                ]}
                              />
                            ) : null;
                          })}
                        </View>
                      </View>
                    )}
                    
                    {hasDiary && snippetText && (
                      <DefaultText style={styles.snippetText} numberOfLines={1}>
                        {snippetText}
                      </DefaultText>
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
    <View style={styles.container}>
      <SpouseStatusBar />
      
      {/* 달력 헤더 - MonthPicker 사용 */}
      <View style={styles.calendarHeader}>
        <MonthPicker 
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
        <DefaultText style={styles.monthSubtitle}>
          소중한 순간들을 기록해보세요
        </DefaultText>
      </View>
      
      {/* 달력 컨테이너 */}
      <View style={styles.calendarContainer}>
        {loading ? (
          <CalendarSkeleton />
        ) : (
          renderCalendarForMonth(currentMonth)
        )}
      </View>
      

      
      {/* 간단한 바텀 시트 */}
      {modalVisible && (() => {
        console.log("🔍 바텀시트 렌더링됨!");
        return (
          <View style={styles.simpleBottomSheet}>
            {/* 헤더 */}
            <View style={styles.simpleHeader}>
              <DefaultText style={styles.simpleDateText}>
                {selectedDiaryDate && formatDisplayDate(selectedDiaryDate.replace(/(\d+)-(\d+)-(\d+)/, '$1-$2-$3'))}
              </DefaultText>
              <TouchableOpacity onPress={closeModal} style={styles.simpleCloseButton}>
                <Ionicons name="close" size={24} color="#8D7A65" />
              </TouchableOpacity>
            </View>

            {/* 감정 태그 - SVG 아이콘 적용 */}
            {selectedDiaryEmotions.length > 0 && (
              <View style={styles.simpleEmotionsSection}>
                <DefaultText style={styles.simpleEmotionsTitle}>오늘의 감정</DefaultText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedDiaryEmotions.map(emotionId => {
                    const emotion = BASIC_EMOTIONS.find(e => e.id === emotionId);
                    return emotion ? (
                      <View key={emotionId} style={[styles.simpleEmotionTag, { backgroundColor: emotion.color }]}>
                        <emotion.icon />
                        <DefaultText style={styles.simpleEmotionLabel}>{emotion.label}</DefaultText>
                      </View>
                    ) : null;
                  })}
                </ScrollView>
              </View>
            )}

            {/* 일기 내용 */}
            <ScrollView style={styles.simpleContentScroll} showsVerticalScrollIndicator={true}>
              <DefaultText style={styles.simpleDiaryContent}>
                {selectedDiaryContent}
              </DefaultText>
            </ScrollView>

            {/* 수정하기 버튼 */}
            <View style={styles.simpleFooter}>
              <TouchableOpacity style={styles.simpleEditButton} onPress={directNavigate}>
                <Ionicons name="create" size={16} color="#FFFFFF" />
                <DefaultText style={styles.simpleEditButtonText}>수정하기</DefaultText>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#ffffff",
    position: 'relative',
  },
  calendarHeader: {
    alignItems: "center",
    marginBottom: 40,
    paddingTop: 24,
    paddingBottom: 16,
  },
  calendarContainer: {
    flex: 1,
    position: 'relative',
  },
  monthSubtitle: {
    fontSize: 15,
    color: '#637788',
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 12,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontWeight: "600",
    color: '#111518',
    fontSize: 15,
  },
  week: {
    flexDirection: "row",
    marginBottom: 8,
    height: 68,
    paddingHorizontal: 4,
  },
  day: {
    flex: 1,
    height: 68,
    alignItems: "center",
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 2,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    paddingTop: 8,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#111518',
    fontWeight: '500',
  },
  selectedDay: {
    backgroundColor: "#f0f2f4",
    shadowColor: '#f0f2f4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  otherMonthDayText: {
    color: "#637788",
  },
  sundayText: {
    color: "#5B9BD5",
  },
  saturdayText: {
    color: "#5C3A2E",
  },
  // 오늘 날짜 스타일 - 새로운 디자인 컨셉
  todayDay: {
    backgroundColor: '#f0f2f4',
  },
  emotionLineContainer: {
    position: 'absolute',
    bottom: 18,
    left: 6,
    right: 6,
    height: 4,
  },
  emotionLine: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  emotionSegment: {
    flex: 1,
    height: 4,
  },
  firstSegment: {
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  lastSegment: {
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  snippetText: {
    fontSize: 8,
    color: '#637788',
    textAlign: 'center',
    width: '100%',
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    paddingHorizontal: 2,
    fontWeight: '400',
  },
  // 스켈레톤 로더 스타일
  skeletonContainer: {
    padding: 10,
  },
  skeletonWeek: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  skeletonDay: {
    flex: 1,
    height: 68,
    backgroundColor: '#f0f2f4',
    borderRadius: 12,
    marginHorizontal: 2,
    opacity: 0.6,
  },
  

  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#5B9BD5',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 95,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFBF7',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  
  // 바텀시트 스타일 (원본 그대로 유지)
  simpleBottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#3B3029",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    borderTopWidth: 1,
    borderTopColor: '#F9F6F3',
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
    borderBottomColor: '#F9F6F3',
  },
  simpleDateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111518',
  },
  simpleCloseButton: {
    padding: 8,
  },
  simpleEmotionsSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F6F3',
  },
  simpleEmotionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111518',
    marginBottom: 12,
  },
  simpleEmotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  simpleEmotionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111518',
    marginLeft: 4,
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
    color: '#111518',
    fontWeight: '400',
  },
  simpleFooter: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9F6F3',
    backgroundColor: '#FFFFFF',
  },
  simpleEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#dce1e5',
    borderRadius: 12,
    backgroundColor: '#198ae6',
  },
  simpleEditButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
});