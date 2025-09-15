// app/diary/[date].tsx - 체크인 + 한줄 일기 통합
import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import DefaultText from '../../components/DefaultText';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// 체크인용 기분
const QUICK_MOODS = [
  { id: 'great', emoji: '😄', label: '매우 좋음' },
  { id: 'good', emoji: '😊', label: '좋음' },
  { id: 'neutral', emoji: '😐', label: '보통' },
  { id: 'bad', emoji: '😟', label: '나쁨' },
  { id: 'terrible', emoji: '😢', label: '매우 나쁨' }
];

// 관계 온도
const RELATIONSHIP_TEMPS = [
  { level: 1, label: '차가움' },
  { level: 2, label: '서늘함' },
  { level: 3, label: '보통' },
  { level: 4, label: '따뜻함' },
  { level: 5, label: '뜨거움' }
];

export default function DiaryByDatePage() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  
  // 체크인 상태
  const [quickMood, setQuickMood] = useState<string>('');
  const [relationshipTemp, setRelationshipTemp] = useState<number>(3);
  const [todayEvent, setTodayEvent] = useState<string>(''); // 오늘의 한줄 (일기 역할)
  const [checkInSaved, setCheckInSaved] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [spouseData, setSpouseData] = useState<any>(null);

  useEffect(() => {
    fetchExistingData();
    fetchSpouseData();
    fetchWeeklyCount();
  }, [date]);

  const fetchExistingData = async () => {
    try {
      if (!auth.currentUser || !date) return;
      const paddedDate = formatDate(date);
      const ref = doc(db, 'diaries', `${auth.currentUser.uid}_${paddedDate}`);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        const data: any = snap.data();
        if (data.quickCheck) {
          setQuickMood(data.quickCheck.mood || '');
          setRelationshipTemp(data.quickCheck.temperature || 3);
          setTodayEvent(data.quickCheck.todayEvent || '');
          setCheckInSaved(true);
        }
        // 기존 일기 데이터가 있으면 한줄로 마이그레이션
        if (data.text && !data.quickCheck?.todayEvent) {
          const shortText = data.text.substring(0, 100);
          setTodayEvent(shortText);
        }
      }
    } catch (e) {
      console.error('데이터 불러오기 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpouseData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      const spouseId = userDoc.data()?.spouseId;
      
      if (spouseId && date) {
        const paddedDate = formatDate(date);
        const spouseRef = doc(db, 'diaries', `${spouseId}_${paddedDate}`);
        const spouseSnap = await getDoc(spouseRef);
        
        if (spouseSnap.exists()) {
          setSpouseData(spouseSnap.data()?.quickCheck);
        }
      }
    } catch (e) {
      console.error('배우자 데이터 불러오기 실패:', e);
    }
  };

  const fetchWeeklyCount = async () => {
    try {
      if (!auth.currentUser) return;
      
      const today = new Date();
      const dayOfWeek = today.getDay();
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - dayOfWeek);
      
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(sunday);
        checkDate.setDate(sunday.getDate() + i);
        const checkDateStr = checkDate.toISOString().split('T')[0];
        const dateStr = formatDate(checkDateStr);
        
        const ref = doc(db, 'diaries', `${auth.currentUser.uid}_${dateStr}`);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          const data = snap.data();
          if (data.quickCheck?.todayEvent && data.quickCheck.todayEvent.length >= 10) {
            count++;
          }
        }
      }
      
      setWeeklyCount(count);
    } catch (e) {
      console.error('주간 카운트 오류:', e);
    }
  };

  const formatDate = (dateStr: string) => {
    return String(dateStr).replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/, 
      (_m, y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  };

  const saveQuickCheck = async () => {
    if (!quickMood) {
      Alert.alert('체크인', '기분을 선택해주세요');
      return;
    }

    try {
      if (!auth.currentUser || !date) return;
      const paddedDate = formatDate(date as string);
      const ref = doc(db, 'diaries', `${auth.currentUser.uid}_${paddedDate}`);
      
      await setDoc(ref, {
        userId: auth.currentUser.uid,
        date: paddedDate,
        quickCheck: {
          mood: quickMood,
          temperature: relationshipTemp,
          todayEvent: todayEvent.trim(),
          timestamp: new Date().toISOString()
        },
        // 하위 호환성을 위해 text 필드도 저장
        text: todayEvent.trim(),
        emotions: [quickMood],
        updatedAt: new Date()
      }, { merge: true });
      
      setCheckInSaved(true);
      
      if (todayEvent.trim().length >= 10) {
        setWeeklyCount(prev => prev + 1);
      }
      
      Alert.alert('저장 완료', '오늘의 기록이 저장되었습니다', [
        { text: '확인', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error('저장 실패:', e);
      Alert.alert('오류', '저장에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <DefaultText style={styles.loadingText}>불러오는 중...</DefaultText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <DefaultText style={styles.headerTitle}>{date}</DefaultText>
          <DefaultText style={styles.headerSubtitle}>일일 체크인</DefaultText>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* 체크인 섹션 */}
        <View style={styles.checkInSection}>
          <View style={styles.sectionHeader}>
            <DefaultText style={styles.sectionTitle}>오늘의 기록</DefaultText>
            <DefaultText style={styles.sectionSubtitle}>간단하게 하루를 기록하세요</DefaultText>
          </View>

          {/* 기분 선택 */}
          <View style={styles.checkInItem}>
            <DefaultText style={styles.checkInLabel}>기분</DefaultText>
            <View style={styles.moodContainer}>
              {QUICK_MOODS.map(mood => (
                <TouchableOpacity
                  key={mood.id}
                  style={[styles.moodButton, quickMood === mood.id && styles.moodSelected]}
                  onPress={() => setQuickMood(mood.id)}
                  disabled={checkInSaved}
                >
                  <View style={styles.moodContent}>
                    <DefaultText style={styles.moodEmoji}>{mood.emoji}</DefaultText>
                    <DefaultText style={[styles.moodLabel, quickMood === mood.id && styles.moodLabelSelected]}>
                      {mood.label}
                    </DefaultText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 관계 온도 */}
          <View style={styles.checkInItem}>
            <DefaultText style={styles.checkInLabel}>관계 온도</DefaultText>
            <View style={styles.tempContainer}>
              {[1, 2, 3, 4, 5].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[styles.tempButton, relationshipTemp >= level && styles.tempButtonActive]}
                  onPress={() => setRelationshipTemp(level)}
                  disabled={checkInSaved}
                >
                  <DefaultText style={[styles.tempIcon, relationshipTemp >= level && styles.tempIconActive]}>
                    🔥
                  </DefaultText>
                </TouchableOpacity>
              ))}
            </View>
            <DefaultText style={styles.tempLabel}>
              {RELATIONSHIP_TEMPS.find(t => t.level === relationshipTemp)?.label}
            </DefaultText>
          </View>

          {/* 오늘의 한줄 일기 */}
          <View style={styles.checkInItem}>
            <View style={styles.todayEventHeader}>
              <DefaultText style={styles.checkInLabel}>한줄 일기</DefaultText>
              <DefaultText style={styles.charCount}>
                {todayEvent.length}/100
              </DefaultText>
            </View>
            <TextInput
              style={styles.todayEventInput}
              placeholder="오늘 있었던 일을 간단히 기록하세요 (선택사항)"
              placeholderTextColor="#95A5A6"
              value={todayEvent}
              onChangeText={(text) => text.length <= 100 && setTodayEvent(text)}
              maxLength={100}
              editable={!checkInSaved}
              multiline
            />
            {todayEvent.length > 0 && todayEvent.length < 10 && (
              <DefaultText style={styles.minCharWarning}>
                10자 이상 작성시 주간 레포트 분석에 포함됩니다
              </DefaultText>
            )}
          </View>

          {/* 주간 진행 상황 */}
          <View style={styles.weeklyProgress}>
            <DefaultText style={styles.progressTitle}>
              주간 레포트 진행률
            </DefaultText>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min((weeklyCount / 4) * 100, 100)}%` }
                  ]} 
                />
              </View>
              <DefaultText style={styles.progressCount}>
                {weeklyCount}/4
              </DefaultText>
            </View>
            {weeklyCount >= 4 ? (
              <DefaultText style={styles.progressText}>
                일요일에 AI 레포트가 발행됩니다
              </DefaultText>
            ) : (
              <DefaultText style={styles.progressText}>
                {4 - weeklyCount}개 더 작성하면 주간 레포트를 받을 수 있습니다
              </DefaultText>
            )}
          </View>

          {/* 배우자 체크인 표시 */}
          {spouseData && (
            <View style={styles.spouseCheckIn}>
              <DefaultText style={styles.spouseTitle}>배우자 체크인</DefaultText>
              <View style={styles.spouseData}>
                <View style={styles.spouseItem}>
                  <DefaultText style={styles.spouseLabel}>기분</DefaultText>
                  <DefaultText style={styles.spouseValue}>
                    {QUICK_MOODS.find(m => m.id === spouseData.mood)?.emoji || '-'}
                  </DefaultText>
                </View>
                <View style={styles.spouseItem}>
                  <DefaultText style={styles.spouseLabel}>온도</DefaultText>
                  <View style={styles.spouseTempContainer}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <DefaultText 
                        key={i} 
                        style={[
                          styles.spouseTempIcon,
                          i < spouseData.temperature && styles.spouseTempActive
                        ]}
                      >
                        🔥
                      </DefaultText>
                    ))}
                  </View>
                </View>
              </View>
              {Math.abs(relationshipTemp - spouseData.temperature) > 2 && (
                <View style={styles.alert}>
                  <Ionicons name="information-circle" size={16} color="#F39C12" />
                  <DefaultText style={styles.alertText}>
                    온도 차이가 있습니다. 대화가 필요할 수 있어요
                  </DefaultText>
                </View>
              )}
            </View>
          )}

          {/* 저장 버튼 */}
          {!checkInSaved && (
            <TouchableOpacity style={styles.saveBtn} onPress={saveQuickCheck}>
              <DefaultText style={styles.saveBtnText}>저장</DefaultText>
            </TouchableOpacity>
          )}

          {checkInSaved && (
            <View style={styles.checkInComplete}>
              <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
              <DefaultText style={styles.checkInCompleteText}>저장 완료</DefaultText>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    color: '#7F8C8D',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerBtn: {
    padding: 4,
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  
  // 체크인 섹션
  checkInSection: {
    margin: 16,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  checkInItem: {
    marginBottom: 28,
  },
  checkInLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 12,
  },
  
  // 기분 선택
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  moodButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  moodContent: {
    alignItems: 'center',
  },
  moodSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 11,
    color: '#7F8C8D',
    fontWeight: '500',
    textAlign: 'center',
  },
  moodLabelSelected: {
    color: '#4A90E2',
    fontWeight: '700',
  },
  
  // 관계 온도
  tempContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tempButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  tempButtonActive: {
    backgroundColor: '#FFF3E0',
  },
  tempIcon: {
    fontSize: 26,
    opacity: 0.3,
  },
  tempIconActive: {
    opacity: 1,
  },
  tempLabel: {
    textAlign: 'center',
    fontSize: 14,
    color: '#34495E',
    fontWeight: '600',
    marginTop: 4,
  },
  
  // 한줄 일기
  todayEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  charCount: {
    fontSize: 13,
    color: '#95A5A6',
  },
  todayEventInput: {
    borderWidth: 1,
    borderColor: '#E8ECF0',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#2C3E50',
    backgroundColor: '#FAFBFC',
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  minCharWarning: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 6,
  },
  
  // 주간 진행 상황
  weeklyProgress: {
    padding: 18,
    backgroundColor: '#F0F7FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4E6F7',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8F0F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  progressText: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 10,
  },
  
  // 배우자 체크인
  spouseCheckIn: {
    padding: 16,
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0ECFA',
    marginBottom: 20,
  },
  spouseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  spouseData: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  spouseItem: {
    alignItems: 'center',
  },
  spouseLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 6,
  },
  spouseValue: {
    fontSize: 24,
  },
  spouseTempContainer: {
    flexDirection: 'row',
  },
  spouseTempIcon: {
    fontSize: 16,
    opacity: 0.3,
  },
  spouseTempActive: {
    opacity: 1,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF9E6',
    borderRadius: 10,
  },
  alertText: {
    fontSize: 12,
    color: '#F39C12',
    marginLeft: 8,
    flex: 1,
  },
  
  // 버튼
  saveBtn: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkInComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#E8F8F5',
    borderRadius: 12,
  },
  checkInCompleteText: {
    color: '#27AE60',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});