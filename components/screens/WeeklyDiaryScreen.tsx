// app/screens/WeeklyDiaryScreen.tsx - 감정 스티커 + 요일 + 수정/삭제 완전 개선 버전
import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig";
import { generateClaudeReport } from "../../utils/claudeApi";
import DefaultText from "../DefaultText";
import { Ionicons } from '@expo/vector-icons';

// 감정 아이콘 컴포넌트들 (Ionicons 사용)
const JoyIcon = () => <Ionicons name="happy" size={16} color="#FFE5B4" />;
const SadnessIcon = () => <Ionicons name="sad" size={16} color="#B4D4E7" />;
const AngerIcon = () => <Ionicons name="flash" size={16} color="#FFB4B4" />;
const FearIcon = () => <Ionicons name="alert-circle" size={16} color="#E6D4FF" />;
const SurpriseIcon = () => <Ionicons name="star" size={16} color="#FFD4B4" />;
const DisgustIcon = () => <Ionicons name="close-circle" size={16} color="#D4D4D4" />;

// 폴 에크만의 6가지 기본 감정 (다이어리 페이지와 동일)
const BASIC_EMOTIONS = [
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

// 날짜 포맷 함수
function formatDateToString(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 요일 변환 함수
function getKoreanDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[date.getDay()];
}

// 날짜 포맷팅 함수 (표시용)
function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const dayOfWeek = getKoreanDayOfWeek(dateStr);
  return `${parseInt(month)}월 ${parseInt(day)}일 (${dayOfWeek})`;
}

interface DiaryItem {
  id: string;
  date: string;
  text: string;
  emotionStickers?: string[];
  userId: string;
  updatedAt: string;
}

interface ExpandedDiary {
  [key: string]: boolean;
}

export default function WeeklyDiaryScreen() {
  const router = useRouter();
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [combinedText, setCombinedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  // 수정 모달 관련 state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryItem | null>(null);
  const [editText, setEditText] = useState("");
  const [editStickers, setEditStickers] = useState<string[]>([]);
  const [expandedDiaries, setExpandedDiaries] = useState<ExpandedDiary>({});

  useEffect(() => {
    fetchWeekDiaries();
  }, []);

  const fetchWeekDiaries = async () => {
    if (!auth.currentUser) {
      console.log("로그인이 필요합니다.");
      return;
    }
    setLoading(true);

    const userId = auth.currentUser.uid;
    const today = new Date();
    const aWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStr = formatDateToString(today);
    const aWeekAgoStr = formatDateToString(aWeekAgo);

    try {
      const diariesRef = collection(db, "diaries");
      const q = query(
        diariesRef,
        where("userId", "==", userId),
        where("date", ">=", aWeekAgoStr),
        where("date", "<=", todayStr)
      );
      const snap = await getDocs(q);
      const fetched = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as DiaryItem[];
      
      // 날짜순 정렬 (최신순)
      fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setDiaries(fetched);

      const combined = fetched
        .map((d: DiaryItem) => `- ${d.date}:\n${d.text}\n`)
        .join("\n");
      setCombinedText(combined);

      console.log("주간 일기 목록:", fetched);
    } catch (err) {
      console.error("주간 다이어리 불러오기 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 다이어리 펼치기/접기
  const toggleDiaryExpansion = (diaryId: string) => {
    setExpandedDiaries(prev => ({
      ...prev,
      [diaryId]: !prev[diaryId]
    }));
  };

  // 수정 모달 열기
  const openEditModal = (diary: DiaryItem) => {
    setSelectedDiary(diary);
    setEditText(diary.text);
    setEditStickers(diary.emotionStickers || []);
    setEditModalVisible(true);
  };

  // 감정 스티커 토글
  const toggleEditSticker = (stickerId: string) => {
    setEditStickers(prev => {
      if (prev.includes(stickerId)) {
        return prev.filter(id => id !== stickerId);
      } else {
        return [...prev, stickerId];
      }
    });
  };

  // 다이어리 수정 저장
  const handleSaveEdit = async () => {
    if (!selectedDiary) return;

    try {
      const diaryRef = doc(db, "diaries", selectedDiary.id);
      await updateDoc(diaryRef, {
        text: editText,
        emotionStickers: editStickers,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert("완료", "다이어리가 수정되었습니다!");
      setEditModalVisible(false);
      fetchWeekDiaries(); // 목록 새로고침
    } catch (error) {
      console.error("다이어리 수정 오류:", error);
      Alert.alert("오류", "다이어리 수정에 실패했습니다.");
    }
  };

  // 다이어리 삭제
  const handleDeleteDiary = (diary: DiaryItem) => {
    Alert.alert(
      "삭제 확인",
      `${formatDisplayDate(diary.date)} 다이어리를 정말 삭제하시겠어요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "diaries", diary.id));
              Alert.alert("완료", "다이어리가 삭제되었습니다.");
              fetchWeekDiaries(); // 목록 새로고침
            } catch (error) {
              console.error("다이어리 삭제 오류:", error);
              Alert.alert("오류", "다이어리 삭제에 실패했습니다.");
            }
          }
        }
      ]
    );
  };

  const handleSendToAI = async () => {
    if (!combinedText) {
      Alert.alert("알림", "주간 다이어리 데이터가 없습니다.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("오류", "로그인 상태를 확인하세요.");
      return;
    }

    try {
      setAiLoading(true);
      setLoadingMessage("AI가 일기를 분석하고 있어요...");
      
             const aiResponse = await generateClaudeReport(combinedText);
      
      setLoadingMessage("레포트를 저장하고 있어요...");
      
      const ownerId = user.uid;
      const reportsRef = collection(db, "reports");
      const reportDocRef = doc(reportsRef);
      await setDoc(reportDocRef, {
        ownerId: ownerId,
        reportText: aiResponse,
        createdAt: new Date().toISOString(),
      });

      setLoadingMessage("레포트로 이동 중...");
      
      setTimeout(() => {
        router.push(`/reports` as any);
      }, 1000);
      
    } catch (error) {
      console.error("AI 호출 오류:", error);
      Alert.alert("오류", "AI 레포트 생성에 실패했습니다.");
      setAiLoading(false);
      setLoadingMessage("");
    }
  };

  // 감정 스티커 렌더링 함수
  const renderEmotionStickers = (stickers: string[]) => {
    if (!stickers || stickers.length === 0) return null;

    return (
      <View style={styles.emotionContainer}>
        {stickers.slice(0, 5).map(stickerId => {
          const emotion = BASIC_EMOTIONS.find(e => e.id === stickerId);
          return emotion ? (
            <View key={stickerId} style={[styles.emotionSticker, { backgroundColor: emotion.color }]}>
              <View style={styles.emotionIconWrapper}>
                <emotion.icon width={20} height={20} />
              </View>
              <DefaultText style={styles.emotionLabel}>{emotion.label}</DefaultText>
            </View>
          ) : null;
        })}
        {stickers.length > 5 && (
          <DefaultText style={styles.moreEmotions}>+{stickers.length - 5}</DefaultText>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <DefaultText style={styles.title}>최근 7일 다이어리</DefaultText>
      <DefaultText style={styles.subtitle}>감정과 함께 기록된 소중한 이야기들</DefaultText>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8D7A65" />
          <DefaultText style={styles.loading}>불러오는 중...</DefaultText>
        </View>
      ) : (
        <ScrollView style={styles.diaryList} showsVerticalScrollIndicator={false}>
          {diaries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <DefaultText style={styles.noDiary}>아직 작성된 일기가 없어요</DefaultText>
              <DefaultText style={styles.noDiarySubtext}>
                하루의 감정과 이야기를 기록해보세요
              </DefaultText>
            </View>
          ) : (
            diaries.map((item, index) => {
              const isExpanded = expandedDiaries[item.id] || false;
              
              return (
                <View key={item.id || index} style={styles.diaryItem}>
                  <View style={styles.diaryHeader}>
                    <DefaultText style={styles.diaryDate}>
                      {formatDisplayDate(item.date)}
                    </DefaultText>
                  </View>
                  
                  {renderEmotionStickers(item.emotionStickers || [])}
                  
                  <TouchableOpacity
                    onPress={() => toggleDiaryExpansion(item.id)}
                    activeOpacity={0.7}
                  >
                    <DefaultText 
                      style={styles.diaryText} 
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      {item.text}
                    </DefaultText>
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(item)}
                      >
                        <DefaultText style={styles.editButtonText}>수정</DefaultText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteDiary(item)}
                      >
                        <DefaultText style={styles.deleteButtonText}>삭제</DefaultText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.button, aiLoading && styles.buttonDisabled]}
        onPress={handleSendToAI}
        disabled={aiLoading || diaries.length === 0}
      >
        {aiLoading ? (
          <View style={styles.buttonLoadingContainer}>
            <ActivityIndicator size="small" color="#5D4E37" />
            <DefaultText style={styles.loadingText}>{loadingMessage}</DefaultText>
          </View>
        ) : (
          <DefaultText style={styles.buttonText}>
            {diaries.length === 0 ? "일기를 먼저 작성해주세요" : "AI에게 레포트 받기"}
          </DefaultText>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <DefaultText style={styles.backButtonText}>돌아가기</DefaultText>
      </TouchableOpacity>

      {/* 수정 모달 */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <DefaultText style={styles.modalTitle}>다이어리 수정하기</DefaultText>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <DefaultText style={styles.modalCloseButton}>✕</DefaultText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* 감정 스티커 수정 */}
            <View style={styles.modalSection}>
              <DefaultText style={styles.modalSectionTitle}>감정 선택</DefaultText>
              <View style={styles.editStickersGrid}>
                {BASIC_EMOTIONS.map((emotion) => {
                  const isSelected = editStickers.includes(emotion.id);
                  return (
                    <TouchableOpacity
                      key={emotion.id}
                      style={[
                        styles.editStickerButton,
                        isSelected && { backgroundColor: emotion.color, borderColor: '#5D4E37' }
                      ]}
                      onPress={() => toggleEditSticker(emotion.id)}
                    >
                      <emotion.icon width={20} height={20} />
                      <DefaultText style={[
                        styles.editStickerLabel,
                        isSelected && styles.selectedEditStickerLabel
                      ]}>
                        {emotion.label}
                      </DefaultText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 텍스트 수정 */}
            <View style={styles.modalSection}>
              <DefaultText style={styles.modalSectionTitle}>일기 내용</DefaultText>
              <TextInput
                style={styles.editTextInput}
                value={editText}
                onChangeText={setEditText}
                placeholder="오늘의 이야기를 수정해주세요..."
                placeholderTextColor="#A08B6F"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <DefaultText style={styles.modalCancelButtonText}>취소</DefaultText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveEdit}
            >
              <DefaultText style={styles.modalSaveButtonText}>저장하기</DefaultText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111518",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#637788",
    textAlign: "center",
    marginBottom: 25,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loading: {
    textAlign: "center",
    marginTop: 15,
    fontSize: 16,
    color: "#637788",
  },
  diaryList: {
    flex: 1,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  noDiary: {
    textAlign: "center",
    fontSize: 18,
    color: "#637788",
    fontWeight: "600",
    marginBottom: 8,
  },
  noDiarySubtext: {
    textAlign: "center",
    fontSize: 14,
    color: "#637788",
  },
  diaryItem: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  diaryHeader: {
    marginBottom: 12,
  },
  diaryDate: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111518",
  },
  emotionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    alignItems: "center",
  },
     emotionSticker: {
     paddingHorizontal: 8,
     paddingVertical: 6,
     borderRadius: 12,
     marginRight: 8,
     marginBottom: 6,
     alignItems: 'center',
     minWidth: 60,
   },
   emotionIconWrapper: {
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 2,
   },
   emotionLabel: {
     fontSize: 10,
     color: '#111518',
     fontWeight: '600',
     textAlign: 'center',
   },
  emotionEmoji: {
    fontSize: 14,
  },
  moreEmotions: {
    fontSize: 12,
    color: "#637788",
    fontWeight: "600",
  },
  diaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#111518",
    marginTop: 8,
  },
  readMoreHint: {
    fontSize: 12,
    color: "#637788",
    fontStyle: "italic",
    marginTop: 4,
    textAlign: "right",
  },
  
  // 액션 버튼들
  actionButtons: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#dce1e5",
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f0f2f4",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111518",
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f0f2f4",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#637788",
  },
  button: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#198ae6",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#198ae6",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    backgroundColor: "#637788",
  },
  buttonLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111518",
  },
  backButton: {
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#f0f2f4",
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111518",
  },

  // 모달 스타일
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#dce1e5",
    backgroundColor: "#f0f2f4",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111518",
  },
  modalCloseButton: {
    fontSize: 24,
    color: "#637788",
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 30,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111518",
    marginBottom: 15,
  },
  editStickersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  editStickerButton: {
    width: "18%",
    aspectRatio: 1,
    backgroundColor: "#f0f2f4",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  editStickerEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  editStickerLabel: {
    fontSize: 9,
    color: "#637788",
    textAlign: "center",
    fontWeight: "600",
  },
  selectedEditStickerLabel: {
    color: "#111518",
    fontWeight: "bold",
  },
  editTextInput: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#dce1e5",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "#111518",
    backgroundColor: "#f0f2f4",
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#f0f2f4",
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111518",
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#198ae6",
    borderWidth: 1,
    borderColor: "#198ae6",
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});