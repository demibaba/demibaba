// app/diary/[date].tsx - TypeScript 타입 에러 완전 해결 버전
import React, { useState, useEffect } from "react";
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView,
  Modal,
  Text
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import DefaultText from "../../components/components/DefaultText";
import { Ionicons } from '@expo/vector-icons';

// 감정 아이콘 컴포넌트들 (Ionicons 사용 - props 제거)
const JoyIcon = () => <Ionicons name="happy" size={16} color="#5D4E37" />;
const SadnessIcon = () => <Ionicons name="sad" size={16} color="#5D4E37" />;
const AngerIcon = () => <Ionicons name="flash" size={16} color="#5D4E37" />;
const FearIcon = () => <Ionicons name="alert-circle" size={16} color="#5D4E37" />;
const SurpriseIcon = () => <Ionicons name="star" size={16} color="#5D4E37" />;
const DisgustIcon = () => <Ionicons name="close-circle" size={16} color="#5D4E37" />;

// 글자수 제한 상수
const MAX_DIARY_LENGTH = 1000;

// 폴 에크만 박사의 6가지 기본 감정
const BASIC_EMOTIONS = [
  { 
    id: 'joy', 
    icon: JoyIcon,
    label: '기쁨', 
    color: '#FFE5B4',
    description: '즐겁고 행복한 마음'
  },
  { 
    id: 'sadness', 
    icon: SadnessIcon,
    label: '슬픔', 
    color: '#B4D4E7',
    description: '우울하고 침울한 마음'
  },
  { 
    id: 'anger', 
    icon: AngerIcon,
    label: '분노', 
    color: '#FFB4B4',
    description: '화나고 짜증나는 마음'
  },
  { 
    id: 'fear', 
    icon: FearIcon,
    label: '두려움', 
    color: '#E6D4FF',
    description: '불안하고 무서운 마음'
  },
  { 
    id: 'surprise', 
    icon: SurpriseIcon,
    label: '놀람', 
    color: '#FFD4B4',
    description: '예상치 못한 감정'
  },
  { 
    id: 'disgust', 
    icon: DisgustIcon,
    label: '혐오', 
    color: '#D4D4D4',
    description: '불쾌하고 거부감 드는 마음'
  }
];

// Placeholder 텍스트들
const PLACEHOLDERS = [
  "오늘 무슨 일이 있었나요?",
  "일어난 순서대로 적어도 좋고, 떠오르는대로 적어도 좋아요",
  "짧게 적어도, 길게 적어도 모두 괜찮아요",
  "오늘의 감정을 솔직하게 표현해보세요"
];

// 요일 한국어 변환
const getKoreanDayOfWeek = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[date.getDay()] ?? "";
};

// 날짜 포맷팅 함수
function formatDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  if (!month || !day) return dateStr;
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

// "2025-2-20" → "2025-02-20"로 변환하는 함수
function padDateParam(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  if (!month || !day) return dateStr;
  const mm = month.padStart(2, "0");
  const dd = day.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// 즉시 피드백 생성 함수
const getInstantFeedback = (emotions: string[], text: string): string => {
  const hasMultipleEmotions = emotions.length > 1;
  const isLongDiary = text.length > 300;
  
  if (emotions.includes('joy') && emotions.includes('love')) {
    return "사랑과 기쁨이 가득한 하루였네요! 💕";
  } else if (emotions.includes('joy')) {
    return "기쁜 하루를 보내셨군요! 이런 날들이 더 많아지길 바라요 🌟";
  } else if (emotions.includes('anger') && emotions.includes('sadness')) {
    return "많이 힘드셨겠어요. 토닥토닥, 내일은 더 나은 날이 될 거예요 🤗";
  } else if (emotions.includes('anger')) {
    return "화가 나는 일이 있으셨군요. 감정을 표현하는 것도 중요해요 💪";
  } else if (emotions.includes('sadness')) {
    return "슬픈 마음을 일기로 표현해주셔서 고마워요. 곁에서 토닥토닥 🫂";
  } else if (emotions.includes('fear')) {
    return "불안한 마음이 드셨군요. 깊게 숨을 쉬어보세요 🌸";
  } else if (emotions.includes('surprise')) {
    return "예상치 못한 일이 있으셨네요! 일상의 작은 변화들도 소중해요 ✨";
  } else if (hasMultipleEmotions) {
    return "복잡한 감정들이 섞인 하루였네요. 모든 감정이 소중해요 🌈";
  } else if (isLongDiary) {
    return "오늘의 이야기를 자세히 들려주셔서 감사해요 📝";
  } else {
    return "오늘 하루도 수고하셨어요! 🌙";
  }
};

export default function DiaryEntryPage() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();

  const [diaryText, setDiaryText] = useState("");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showAIOption, setShowAIOption] = useState(false);

  // Early return if date is not available
  if (!date) {
    return (
      <View style={styles.container}>
        <DefaultText style={styles.errorText}>날짜 정보가 없습니다.</DefaultText>
      </View>
    );
  }

  // Placeholder 자동 변경
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 500자 이상일 때 AI 옵션 표시
  useEffect(() => {
    setShowAIOption(diaryText.length >= 500);
  }, [diaryText]);

  // 컴포넌트가 처음 렌더링될 때 다이어리 불러오기
  useEffect(() => {
    const loadDiary = async () => {
      if (!auth.currentUser || !date) return;
      try {
        const paddedDate = padDateParam(date);
        const diaryRef = doc(db, "diaries", `${auth.currentUser.uid}_${paddedDate}`);
        const diarySnap = await getDoc(diaryRef);
        if (diarySnap.exists()) {
          const data = diarySnap.data();
          setDiaryText(data.text || "");
          setSelectedEmotions(data.emotions || data.emotionStickers || []);
        }
      } catch (error) {
        console.error("다이어리 로드 오류:", error);
      }
    };
    loadDiary();
  }, [date]);

  // 감정 선택/해제
  const toggleEmotion = (emotionId: string) => {
    setSelectedEmotions(prev => {
      if (prev.includes(emotionId)) {
        return prev.filter(id => id !== emotionId);
      } else {
        return [...prev, emotionId];
      }
    });
  };

  // 다이어리 저장 함수 (AI 인사이트 옵션 포함)
  const handleSaveDiary = async (withAI: boolean = false) => {
    if (!date) {
      Alert.alert("오류", "날짜 정보가 없어요!");
      return;
    }
    if (!auth.currentUser) {
      Alert.alert("오류", "로그인이 필요합니다.");
      return;
    }

    if (diaryText.length > MAX_DIARY_LENGTH) {
      Alert.alert("글자수 초과", `일기는 ${MAX_DIARY_LENGTH}자까지 작성 가능합니다.`);
      return;
    }

    // 즉시 피드백 생성
    const instantFeedback = getInstantFeedback(selectedEmotions, diaryText);

    setLoading(true);
    try {
      const paddedDate = padDateParam(date);
      const diaryRef = doc(db, "diaries", `${auth.currentUser.uid}_${paddedDate}`);
      
      await setDoc(
        diaryRef,
        {
          text: diaryText,
          emotions: selectedEmotions, // 기본 6가지 감정
          emotionStickers: selectedEmotions, // 호환성을 위해 유지
          date: paddedDate,
          userId: auth.currentUser.uid,
          updatedAt: new Date().toISOString(),
          instantFeedback: instantFeedback, // 즉시 피드백 저장
          requestAIInsight: withAI, // AI 분석 요청 여부
        },
        { merge: true }
      );
      
      // 피드백과 함께 알림
      Alert.alert(
        "💝 " + instantFeedback,
        withAI ? "AI가 더 자세한 인사이트를 준비중이에요!" : "일기가 안전하게 저장되었어요.",
        [{ text: "확인", onPress: () => router.push("/calendar") }]
      );
    } catch (error) {
      console.error("다이어리 저장 오류:", error);
      Alert.alert("오류", "다이어리를 저장할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // Now TypeScript knows date is string, not string | undefined
  const paddedDate = padDateParam(date);
  const dayOfWeek = getKoreanDayOfWeek(date);
  const formattedDate = formatDate(date);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 날짜와 요일 표시 */}
      <View style={styles.dateSection}>
        <DefaultText style={styles.dateText}>{formattedDate}</DefaultText>
        <DefaultText style={styles.dayText}>{dayOfWeek}</DefaultText>
        <View style={styles.decorativeLine} />
      </View>

      {/* 감정 선택 섹션 - 6가지 기본 감정 */}
      <View style={styles.emotionSection}>
        <DefaultText style={styles.sectionTitle}>
          폴 에크만 박사의 기본 감정 이론에 기반한 6가지 감정을 선택해주세요
        </DefaultText>
        <DefaultText style={styles.sectionSubtitle}>
          오늘의 주요 감정을 모두 선택하실 수 있어요
        </DefaultText>
        
        <View style={styles.emotionsGrid}>
          {BASIC_EMOTIONS.map((emotion) => {
            const isSelected = selectedEmotions.includes(emotion.id);
            const IconComponent = emotion.icon;
            
            return (
              <View key={emotion.id} style={styles.emotionButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.emotionButton,
                    isSelected && styles.selectedEmotionButton
                  ]}
                  onPress={() => toggleEmotion(emotion.id)}
                >
                  <View style={[
                    styles.iconWrapper,
                    isSelected && styles.selectedIconWrapper
                  ]}>
                    <IconComponent />
                  </View>
                </TouchableOpacity>
                <DefaultText style={[
                  styles.emotionLabel,
                  isSelected && styles.selectedEmotionLabel
                ]}>
                  {emotion.label}
                </DefaultText>
              </View>
            );
          })}
        </View>
      </View>

      {/* 선택된 감정 미리보기 */}
      {selectedEmotions.length > 0 && (
        <View style={styles.selectedSection}>
          <DefaultText style={styles.selectedTitle}>선택하신 오늘의 감정</DefaultText>
          <View style={styles.selectedEmotions}>
            {selectedEmotions.map(emotionId => {
              const emotion = BASIC_EMOTIONS.find(e => e.id === emotionId);
              if (!emotion) return null;
              const IconComponent = emotion.icon;
              
              return (
                <View key={emotionId} style={[styles.selectedEmotion, { backgroundColor: emotion.color }]}>
                  <IconComponent />
                  <DefaultText style={styles.selectedLabel}>{emotion.label}</DefaultText>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 다이어리 작성 섹션 */}
      <View style={styles.textSection}>
        <DefaultText style={styles.sectionTitle}>오늘의 이야기</DefaultText>
        
        <TextInput
          style={styles.textInput}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          placeholderTextColor="#A08B6F"
          multiline
          value={diaryText}
          onChangeText={(text) => {
            if (text.length <= MAX_DIARY_LENGTH) {
              setDiaryText(text);
            } else {
              Alert.alert("글자수 초과", `일기는 ${MAX_DIARY_LENGTH}자까지 작성 가능합니다.`);
            }
          }}
          textAlignVertical="top"
          maxLength={MAX_DIARY_LENGTH}
        />
        
        {/* 글자수 표시 */}
        <View style={styles.characterCountContainer}>
          <DefaultText style={[
            styles.characterCount,
            diaryText.length > MAX_DIARY_LENGTH * 0.9 && styles.characterCountWarning
          ]}>
            {diaryText.length} / {MAX_DIARY_LENGTH}
          </DefaultText>
        </View>

        {/* 도움말 버튼 */}
        <TouchableOpacity style={styles.helpButton} onPress={() => setShowHelp(true)}>
          <DefaultText style={styles.helpButtonText}>💭 뭘 써야 할지 모르겠어요</DefaultText>
        </TouchableOpacity>
      </View>

      {/* 저장 버튼들 - 500자 이상일 때 AI 옵션 표시 */}
      {showAIOption ? (
        <View style={styles.saveOptions}>
          <TouchableOpacity 
            style={[styles.aiSaveButton, loading && styles.saveButtonDisabled]} 
            onPress={() => handleSaveDiary(true)} 
            disabled={loading}
          >
            <DefaultText style={styles.saveButtonText}>
              ✨ AI 인사이트 받고 저장하기
            </DefaultText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.simpleSaveButton, loading && styles.saveButtonDisabled]} 
            onPress={() => handleSaveDiary(false)} 
            disabled={loading}
          >
            <DefaultText style={styles.simpleSaveButtonText}>
              📝 그냥 저장하기
            </DefaultText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={() => handleSaveDiary(false)} 
          disabled={loading}
        >
          <DefaultText style={styles.saveButtonText}>
            {loading ? "소중히 저장하는 중..." : "마음을 저장하기"}
          </DefaultText>
        </TouchableOpacity>
      )}

      {/* 도움말 모달 */}
      <Modal
        visible={showHelp}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelp(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setShowHelp(false)}
          activeOpacity={1}
        >
          <View style={styles.helpModal}>
            <DefaultText style={styles.helpTitle}>일기 작성 팁 ✨</DefaultText>
            
            <DefaultText style={styles.helpContent}>
              • 오늘 있었던 일을 편하게 적어보세요{'\n'}
              • 그때 느낀 감정을 중심으로{'\n'}
              • 짧아도 괜찮으니 솔직하게{'\n'}
              • 배우자와의 일이 있었다면 더 좋아요
            </DefaultText>
            
            <DefaultText style={styles.helpExample}>
              💡 예시:{'\n'}
              "오늘 퇴근하고 집에 왔는데 남편이 저녁을 차려놨더라구요. 
              깜짝 놀라기도 하고 고맙기도 했어요. 요즘 제가 힘들어하는 걸 
              알고 있었나봐요."
            </DefaultText>
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowHelp(false)}
            >
              <DefaultText style={styles.closeButtonText}>닫기</DefaultText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 하단 여백 */}
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3E9",
  },
  
  // 날짜 섹션
  dateSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 25,
    backgroundColor: '#F4E4C1',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#8D7A65',
    fontWeight: '500',
    marginBottom: 15,
  },
  decorativeLine: {
    width: 60,
    height: 3,
    backgroundColor: '#C9B8A3',
    borderRadius: 2,
  },

  // 감정 선택 섹션
  emotionSection: {
    backgroundColor: '#FAF6F0',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0D5A8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 26,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8D7A65',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 20,
  },
  emotionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  // 감정 버튼 컨테이너 (버튼 + 라벨)
  emotionButtonContainer: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  // 감정 버튼 (아이콘만)
  emotionButton: {
    width: 75,
    height: 75,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8D5B7',
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // 선택된 감정 버튼
  selectedEmotionButton: {
    backgroundColor: '#FFF8F0',
    borderColor: '#C9B8A3',
    borderWidth: 3,
    shadowColor: '#C9B8A3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  // 선택된 아이콘 래퍼
  selectedIconWrapper: {
    backgroundColor: '#FFF8F0', // 선택 시 배경색 변경
    borderRadius: 12,
  },
  // 아이콘 래퍼
  iconWrapper: {
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF', // 통일된 흰색 배경
    borderRadius: 12, // 둥근 모서리
  },
  // 감정 라벨 (버튼 밖)
  emotionLabel: {
    fontSize: 13,
    color: '#8D7A65',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
  },
  selectedEmotionLabel: {
    color: '#5D4E37',
    fontWeight: 'bold',
  },

  // 선택된 감정 미리보기
  selectedSection: {
    backgroundColor: '#FAF6F0',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0D5A8',
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 15,
    textAlign: 'center',
  },
  selectedEmotions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  selectedEmotion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 70,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#5D4E37',
    fontWeight: '600',
    marginLeft: 6,
  },

  // 텍스트 작성 섹션
  textSection: {
    backgroundColor: '#FAF6F0',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0D5A8',
  },
  textInput: {
    minHeight: 200,
    borderWidth: 1.5,
    borderColor: '#E8D5B7',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: '#5D4E37',
    backgroundColor: '#F7F3E9',
    lineHeight: 26,
    marginTop: 15,
  },
  characterCountContainer: {
    alignItems: 'flex-end',
    marginTop: 10,
    paddingRight: 5,
  },
  characterCount: {
    fontSize: 12,
    color: '#8D7A65',
    fontWeight: '500',
  },
  characterCountWarning: {
    color: '#FF6B6B',
  },

  // 도움말 버튼
  helpButton: {
    marginTop: 15,
    backgroundColor: '#F0D5A8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'center',
  },
  helpButtonText: {
    fontSize: 14,
    color: '#5D4E37',
    fontWeight: '600',
  },

  // 저장 버튼들
  saveButton: {
    marginHorizontal: 20,
    backgroundColor: '#C9B8A3',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#BDA990',
  },
  saveOptions: {
    marginHorizontal: 20,
  },
  aiSaveButton: {
    backgroundColor: '#C9B8A3',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#BDA990',
  },
  simpleSaveButton: {
    backgroundColor: '#E8D5B7',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4C5A9',
  },
  saveButtonDisabled: {
    backgroundColor: '#E8D5B7',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4E37',
  },
  simpleSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4E37',
  },

  // 도움말 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpModal: {
    backgroundColor: '#FAF6F0',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 20,
    textAlign: 'center',
  },
  helpContent: {
    fontSize: 16,
    color: '#8D7A65',
    lineHeight: 24,
    marginBottom: 20,
  },
  helpExample: {
    fontSize: 14,
    color: '#8D7A65',
    lineHeight: 22,
    backgroundColor: '#F7F3E9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#C9B8A3',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5D4E37',
  },

  // 기타
  errorText: {
    fontSize: 16,
    color: '#A08B6F',
    textAlign: 'center',
    marginTop: 100,
  },
  bottomSpace: {
    height: 40,
  },
});