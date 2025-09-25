import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DefaultText from "../../components/DefaultText";
import { auth, db } from "../../config/firebaseConfig";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";

// 감정 데이터
const EMOTIONS = [
  { id: 'great', label: '매우 좋음', emoji: '😄', color: '#4CAF50' },
  { id: 'good', label: '좋음', emoji: '🙂', color: '#8BC34A' },
  { id: 'neutral', label: '보통', emoji: '😐', color: '#FFC107' },
  { id: 'bad', label: '나쁨', emoji: '😕', color: '#FF9800' },
  { id: 'terrible', label: '매우 나쁨', emoji: '😢', color: '#F44336' },
];

// 관계 상태 옵션
const RELATIONSHIP_STATUS = [
  { id: 'excellent', label: '매우 좋음', emoji: '💕' },
  { id: 'good', label: '좋음', emoji: '❤️' },
  { id: 'normal', label: '보통', emoji: '💛' },
  { id: 'tension', label: '긴장', emoji: '💔' },
  { id: 'conflict', label: '갈등', emoji: '😠' },
];

export default function DiaryEntryScreen() {
  const { date } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 감정 (단일 선택)
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  
  // 대화 여부
  const [hadConversation, setHadConversation] = useState<boolean | null>(null);
  
  // 목표 달성 체크
  const [goalsCompleted, setGoalsCompleted] = useState({
    conversation10min: false,
    gratitudeShare: false,
    dateActivity: false,
    physicalTouch: false,
  });
  
  // 선택적 일기
  const [diaryText, setDiaryText] = useState('');
  const [showDiary, setShowDiary] = useState(false);
  // 주간 체크인 수
  const [weeklyCount, setWeeklyCount] = useState(0);
  
  // 기존 데이터 로드
  useEffect(() => {
    loadExistingDiary();
    loadWeeklyCount();
  }, [date]);

  // === 날짜 유틸 ===
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const loadExistingDiary = async () => {
    if (!auth.currentUser || !date) return;
    
    try {
      const diaryId = `${auth.currentUser.uid}_${date}`;
      const diaryDoc = await getDoc(doc(db, "diaries", diaryId));
      
      if (diaryDoc.exists()) {
        const data = diaryDoc.data();
        
        // 감정 데이터
        if (data.emotions?.length > 0) {
          setSelectedEmotion(data.emotions[0]);
        } else if (data.emotion) {
          setSelectedEmotion(data.emotion);
        }
        // 대화 여부
        setHadConversation(data.hadConversation ?? null);
        // 목표 체크
        if (data.goalsCompleted) {
          setGoalsCompleted(data.goalsCompleted);
        }
        // 일기
        if (data.text) {
          setDiaryText(data.text);
          setShowDiary(true);
        }
      }
    } catch (error) {
      console.error("일기 로드 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser || !date) return;
    
    if (!selectedEmotion) {
      Alert.alert("알림", "오늘의 감정을 선택해주세요.");
      return;
    }
    if (hadConversation === null) {
      Alert.alert("알림", "오늘 배우자와 대화했는지 선택해주세요.");
      return;
    }
    
    setSaving(true);
    
    try {
      const diaryId = `${auth.currentUser.uid}_${date}`;
      
      await setDoc(doc(db, "diaries", diaryId), {
        userId: auth.currentUser.uid,
        date: date as string,
        emotion: selectedEmotion,
        emotions: [selectedEmotion],
        hadConversation,
        goalsCompleted,
        text: showDiary ? diaryText.trim() : '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
      
      Alert.alert(
        "저장 완료", 
        "오늘의 체크인이 완료되었습니다!",
        [{ text: "확인", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("저장 오류:", error);
      Alert.alert("오류", "저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 실제 주간 체크인 횟수 계산
  const getWeeklyCheckInCount = async () => {
    if (!auth.currentUser) return 0;
    try {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 6);
      const qRef = query(
        collection(db, "diaries"),
        where("userId", "==", auth.currentUser.uid),
        where("date", ">=", ymd(weekAgo)),
        where("date", "<=", ymd(today))
      );
      const snapshot = await getDocs(qRef);
      return snapshot.size;
    } catch (error) {
      console.error("주간 체크인 조회 오류:", error);
      return 0;
    }
  };

  const loadWeeklyCount = async () => {
    const count = await getWeeklyCheckInCount();
    setWeeklyCount(count);
  };

  const handleDelete = () => {
    Alert.alert(
      "일기 삭제",
      "정말 이 일기를 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "삭제", 
          style: "destructive",
          onPress: async () => {
            if (!auth.currentUser || !date) return;
            
            try {
              const diaryId = `${auth.currentUser.uid}_${date}`;
              await deleteDoc(doc(db, "diaries", diaryId));
              router.back();
            } catch (error) {
              console.error("삭제 오류:", error);
              Alert.alert("오류", "삭제 중 문제가 발생했습니다.");
            }
          }
        }
      ]
    );
  };

  const toggleEmotion = (emotionId: string) => {
    setSelectedEmotion(emotionId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <DefaultText style={styles.headerTitle}>
          {date === new Date().toISOString().split('T')[0] ? '오늘의 체크인' : date}
        </DefaultText>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. 감정 선택 - 더 깔끔하게 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DefaultText style={styles.sectionTitle}>오늘의 감정</DefaultText>
            <DefaultText style={styles.sectionRequired}>필수</DefaultText>
          </View>
          <View style={styles.emotionGrid}>
            {EMOTIONS.map(emotion => (
              <TouchableOpacity
                key={emotion.id}
                style={[styles.emotionCard, selectedEmotion === emotion.id && styles.emotionCardSelected]}
                onPress={() => setSelectedEmotion(emotion.id)}
                activeOpacity={0.7}
              >
                <DefaultText style={styles.emotionEmoji}>{emotion.emoji}</DefaultText>
                <DefaultText style={[styles.emotionText, selectedEmotion === emotion.id && styles.emotionTextSelected]}>
                  {emotion.label}
                </DefaultText>
                {selectedEmotion === emotion.id && (
                  <View style={styles.emotionCheck}>
                    <Ionicons name="checkmark" size={12} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 2. 대화 여부 - 시각적 개선 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DefaultText style={styles.sectionTitle}>배우자와 대화</DefaultText>
            <DefaultText style={styles.sectionRequired}>필수</DefaultText>
          </View>
          <View style={styles.conversationContainer}>
            <TouchableOpacity
              style={[styles.conversationCard, hadConversation === true && styles.conversationYes]}
              onPress={() => setHadConversation(true)}
              activeOpacity={0.7}
            >
              <View style={styles.conversationIcon}>
                <Ionicons name="chatbubbles" size={28} color={hadConversation === true ? '#4CAF50' : '#C0C0C0'} />
              </View>
              <DefaultText style={[styles.conversationLabel, hadConversation === true && styles.conversationLabelActive]}>
                대화했어요
              </DefaultText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.conversationCard, hadConversation === false && styles.conversationNo]}
              onPress={() => setHadConversation(false)}
              activeOpacity={0.7}
            >
              <View style={styles.conversationIcon}>
                <Ionicons name="chatbubbles-outline" size={28} color={hadConversation === false ? '#FF6B6B' : '#C0C0C0'} />
              </View>
              <DefaultText style={[styles.conversationLabel, hadConversation === false && styles.conversationLabelNo]}>
                못했어요
              </DefaultText>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. 오늘의 목표 달성 (선택) */}
        <View style={styles.section}>
          <DefaultText style={styles.sectionTitle}>오늘의 관계 목표 ✅</DefaultText>
          <View style={styles.goalsList}>
            {[
              { key: 'conversation10min', label: '10분 이상 대화하기', icon: 'time-outline' },
              { key: 'gratitudeShare', label: '감사한 마음 표현하기', icon: 'heart-outline' },
              { key: 'dateActivity', label: '함께 활동하기', icon: 'walk-outline' },
              { key: 'physicalTouch', label: '따뜻한 스킨십', icon: 'hand-left-outline' },
            ].map(goal => (
              <TouchableOpacity
                key={goal.key}
                style={[styles.goalItem, goalsCompleted[goal.key as keyof typeof goalsCompleted] && styles.goalCompleted]}
                onPress={() => setGoalsCompleted(prev => ({ ...prev, [goal.key]: !prev[goal.key as keyof typeof goalsCompleted] }))}
              >
                <Ionicons name={goal.icon as any} size={20} color={goalsCompleted[goal.key as keyof typeof goalsCompleted] ? '#4CAF50' : '#999'} />
                <DefaultText style={[styles.goalText, goalsCompleted[goal.key as keyof typeof goalsCompleted] && styles.goalTextCompleted]}>
                  {goal.label}
                </DefaultText>
                {goalsCompleted[goal.key as keyof typeof goalsCompleted] && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. 일기 작성 (선택) - 간결한 한줄일기 */}
        {!showDiary ? (
          <TouchableOpacity style={styles.addDiaryButton} onPress={() => setShowDiary(true)}>
            <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
            <View style={styles.addDiaryTextContainer}>
              <DefaultText style={styles.addDiaryText}>한줄일기 작성하기</DefaultText>
              <DefaultText style={styles.addDiarySubText}>작성 시 더 정확한 AI 분석을 제공합니다</DefaultText>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.section}>
            <View style={styles.diaryHeader}>
              <DefaultText style={styles.sectionTitle}>오늘의 한줄일기 ✍️</DefaultText>
              <TouchableOpacity onPress={() => setShowDiary(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            <DefaultText style={styles.diaryGuide}>
              오늘 있었던 일과 감정을 한 문장으로 간단히 적어보세요
            </DefaultText>
            <TextInput
              style={styles.diaryInput}
              placeholder="예: 배우자와 저녁 산책하며 오랜만에 깊은 대화를 나눴다"
              placeholderTextColor="#999"
              value={diaryText}
              onChangeText={(text) => { if (text.length <= 100) setDiaryText(text); }}
              multiline
              maxLength={100}
            />
            <DefaultText style={styles.charCount}>
              {diaryText.length}/100
            </DefaultText>
          </View>
        )}

        {/* 5. 리워드 알림 섹션 - 캘린더와 통일 */}
        <View style={styles.rewardSection}>
          <View style={styles.rewardCard}>
            <View style={styles.rewardIconWrapper}>
              <Ionicons name="document-text-outline" size={20} color="#666" />
            </View>
            <View style={styles.rewardContent}>
              <View style={styles.rewardHeader}>
                <DefaultText style={styles.rewardTitle}>주간 레포트</DefaultText>
                <DefaultText style={styles.rewardHelper}>주 4일 이상 기록시 발행</DefaultText>
              </View>
              <View style={styles.rewardProgress}>
                <DefaultText style={styles.rewardCount}>
                  {weeklyCount >= 4 ? "수령 가능" : `${4 - weeklyCount}일 더`}
                </DefaultText>
                <View style={styles.rewardBar}>
                  <View
                    style={[
                      styles.rewardFill,
                      {
                        width: weeklyCount >= 4 ? "100%" : `${(weeklyCount / 4) * 100}%`,
                        backgroundColor: weeklyCount >= 4 ? "#95D5B2" : "#FFD6A5",
                      },
                    ]}
                  />
                </View>
                {weeklyCount >= 4 && (
                  <DefaultText style={styles.rewardReady}>✓ 일요일 수령</DefaultText>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 저장 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <DefaultText style={styles.saveButtonText}>
            {saving ? "저장 중..." : "저장하기"}
          </DefaultText>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionRequired: { fontSize: 11, color: '#FF6B6B', backgroundColor: '#FFE5E5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', letterSpacing: -0.3, marginBottom: 0 },
  emotionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emotionCard: { width: '31%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  emotionCardSelected: { backgroundColor: '#E3F2FD', borderWidth: 2, borderColor: '#4A90E2' },
  emotionEmoji: { fontSize: 26, marginBottom: 4 },
  emotionText: { fontSize: 11, color: '#666', fontWeight: '500' },
  emotionTextSelected: { color: '#4A90E2', fontWeight: '600' },
  emotionCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  conversationContainer: { flexDirection: 'row', gap: 12 },
  conversationCard: { flex: 1, paddingVertical: 20, borderRadius: 16, backgroundColor: '#F8F9FA', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  conversationYes: { backgroundColor: '#F0FAF0', borderColor: '#4CAF50' },
  conversationNo: { backgroundColor: '#FFF0F0', borderColor: '#FF6B6B' },
  conversationIcon: { marginBottom: 8 },
  conversationLabel: { fontSize: 13, color: '#999', fontWeight: '500' },
  conversationLabelActive: { color: '#4CAF50', fontWeight: '600' },
  conversationLabelNo: { color: '#FF6B6B', fontWeight: '600' },
  textInput: {
    borderWidth: 1,
    borderColor: '#E8ECEF',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addDiaryButton: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F5F9FF',
    borderWidth: 1,
    borderColor: '#DCE9FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addDiaryTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  addDiaryText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  addDiarySubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  diaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  diaryGuide: { fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 18 },
  diaryInput: {
    borderWidth: 1,
    borderColor: '#E8ECEF',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 60,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 6 },
  rewardSection: { marginHorizontal: 16, marginTop: 20, marginBottom: 20 },
  rewardCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  rewardIconWrapper: { marginRight: 12, paddingTop: 2 },
  rewardContent: { flex: 1 },
  rewardHeader: { marginBottom: 10 },
  rewardTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  rewardHelper: { fontSize: 11, color: '#999' },
  rewardProgress: { alignItems: 'flex-start' },
  rewardCount: { fontSize: 13, fontWeight: '400', color: '#666', marginBottom: 6 },
  rewardBar: { width: '100%', height: 6, backgroundColor: '#F5F5F5', borderRadius: 3, overflow: 'hidden' },
  rewardFill: { height: '100%', borderRadius: 3 },
  rewardReady: { fontSize: 11, color: '#4CAF50', marginTop: 6, fontWeight: '500' },
  goalsList: { gap: 10 },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    backgroundColor: '#FAFBFC',
  },
  goalCompleted: { backgroundColor: '#F0FAF0', borderColor: '#CDEAC0' },
  goalText: { flex: 1, marginLeft: 10, color: '#555' },
  goalTextCompleted: { color: '#2E7D32', fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8ECEF',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});