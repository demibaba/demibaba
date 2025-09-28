// components/ImprovedEmotionChart.tsx - 신뢰도 기반 감정 차트
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// ----- 로컬 타입/설정 및 계산기 (외부 의존성 제거) -----
type ReliabilityDiaryData = {
  id?: string;
  date: string;
  emotions?: string[];
  text?: string;
  createdAt?: any;
};

type EmotionReliability = {
  score: number;               // 0..10
  advice: string[];
  level: 'high'|'medium'|'low';
  meaning: string;             // 요약 문구
  trend: 'up'|'down'|'flat';   // 최근 추세
  warning: string;
  dataPoints: number;          // 이번 주 유효 일수
  quality: 'good'|'fair'|'poor';
};

const EMOTION_CONFIG: Record<string, { name: string; emoji: string; color: string }> = {
  happy:   { name: '행복',   emoji: '😊', color: '#4CAF50' },
  calm:    { name: '평온',   emoji: '🧘', color: '#8BC34A' },
  grateful:{ name: '감사',   emoji: '🙏', color: '#66BB6A' },
  anxious: { name: '불안',   emoji: '😟', color: '#FF9800' },
  angry:   { name: '화남',   emoji: '😠', color: '#F44336' },
  sad:     { name: '우울',   emoji: '😢', color: '#9C27B0' },
  stress:  { name: '스트레스', emoji: '😣', color: '#FF7043' },
};

function calculateEmotionReliability(
  currentWeek: ReliabilityDiaryData[],
  previousWeeks: ReliabilityDiaryData[][],
  emotionKey: string
): EmotionReliability {
  const hasEmotion = (d: ReliabilityDiaryData) => Array.isArray(d.emotions) && d.emotions.some(e => String(e).toLowerCase().includes(emotionKey));

  const currentHits = currentWeek.filter(hasEmotion).length;
  const week1 = previousWeeks[0] || []; // 가장 최근 과거 주
  const week2 = previousWeeks[1] || [];
  const week1Hits = week1.filter(hasEmotion).length;
  const week2Hits = week2.filter(hasEmotion).length;

  const score = Math.max(0, Math.min(10, Math.round((currentHits / 7) * 10)));
  const level: EmotionReliability['level'] = score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';
  const meaning = level === 'high' ? '신뢰도 높음' : level === 'medium' ? '신뢰도 보통' : '신뢰도 낮음';
  const trend: EmotionReliability['trend'] = week1Hits > week2Hits ? 'up' : week1Hits < week2Hits ? 'down' : 'flat';
  const warning = level === 'low' ? '이번 주 데이터가 부족해요. 5일 이상 기록해보세요.' : level === 'medium' ? '조금만 더 꾸준히 기록하면 더 정확해져요.' : '좋아요! 현재 패턴 분석이 신뢰할 만해요.';
  const quality: EmotionReliability['quality'] = currentHits >= 5 ? 'good' : currentHits >= 3 ? 'fair' : 'poor';
  const advice = level === 'high'
    ? ['현재 패턴을 유지하세요', '세부 메모를 함께 적으면 더 좋아요']
    : level === 'medium'
      ? ['하루 한 줄이라도 꾸준히 기록해보세요', '키워드/태그를 활용해보세요']
      : ['이번 주 최소 3일 이상 기록을 목표로 해보세요', '잠들기 전 2분 기록 루틴 추천'];

  return { score, advice, level, meaning, trend, warning, dataPoints: currentHits, quality };
}

type MinimalDiary = { date: string; emotions?: string[]; text: string };
interface EmotionChartProps {
  weekData: MinimalDiary[];
}

export default function ImprovedEmotionChart({ weekData }: EmotionChartProps) {
  const [emotionScores, setEmotionScores] = useState<Record<string, EmotionReliability>>({});
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateAllEmotionScores();
  }, [weekData]);

  const calculateAllEmotionScores = async () => {
    try {
      setLoading(true);
      
      // 지난 4주 데이터 가져오기
      const user = auth.currentUser;
      if (!user) return;

      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const diariesQuery = query(
        collection(db, 'diaries'),
        where('userId', '==', user.uid),
        where('date', '>=', fourWeeksAgo.toISOString().split('T')[0]),
        orderBy('date', 'desc'),
        limit(28)
      );
      const querySnapshot = await getDocs(diariesQuery);
      const allDiaries: ReliabilityDiaryData[] = querySnapshot.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          date: String(data.date ?? ''),
          emotions: Array.isArray(data.emotions) ? data.emotions : [],
          text: String(data.text ?? ''),
          createdAt: data.createdAt,
        } as ReliabilityDiaryData;
      });

      // 주별로 그룹화
      const weeklyData: ReliabilityDiaryData[][] = [];
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);

        const weekDiaries = allDiaries.filter(diary => {
          const diaryDate = new Date(diary.date);
          return diaryDate >= weekStart && diaryDate < weekEnd;
        });
        
        weeklyData.push(weekDiaries);
      }

      // 각 감정별 신뢰도 계산
      const scores: Record<string, EmotionReliability> = {};
      const normalizedCurrentWeek: ReliabilityDiaryData[] = weekData.map(d => ({
        date: d.date,
        emotions: Array.isArray(d.emotions) ? d.emotions : [],
        text: d.text ?? '',
        createdAt: undefined as any,
      }));

      Object.keys(EMOTION_CONFIG).forEach(emotionType => {
        scores[emotionType] = calculateEmotionReliability(
          normalizedCurrentWeek,
          weeklyData,
          emotionType
        );
      });

      setEmotionScores(scores);
    } catch (error) {
      console.error('감정 분석 계산 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEmotionBar = (emotionType: string, reliability: EmotionReliability) => {
    const config = EMOTION_CONFIG[emotionType as keyof typeof EMOTION_CONFIG] || { name: emotionType, emoji: '🙂', color: '#9CA3AF' };
    const percentage = (reliability.score / 10) * 100;
    
    return (
      <TouchableOpacity
        key={emotionType}
        style={styles.emotionContainer}
        onPress={() => setSelectedEmotion(emotionType)}
      >
        <View style={styles.emotionHeader}>
          <Text style={styles.emoji}>{config.emoji}</Text>
          <Text style={styles.emotionName}>{config.name}</Text>
          <Text style={styles.emotionScore}>
            {reliability.score}/10
          </Text>
        </View>
        
        <View style={styles.barContainer}>
          <View
            style={[
              styles.barFill,
              { 
                width: `${percentage}%`,
                backgroundColor: config.color,
              }
            ]}
          />
        </View>
        
        <View style={styles.emotionFooter}>
          <Text style={[
            styles.statusText,
            { color: reliability.level === 'high' ? '#2E7D32' : 
                    reliability.level === 'medium' ? '#F57C00' : '#D32F2F' }
          ]}>
            {reliability.meaning}
          </Text>
          <Text style={styles.trendText}>
            {reliability.trend === 'up' ? '↗️' : 
             reliability.trend === 'down' ? '↘️' : '→'}
          </Text>
        </View>
        
        <Text style={styles.infoIcon}>ⓘ</Text>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedEmotion || !emotionScores[selectedEmotion]) return null;
    
    const reliability = emotionScores[selectedEmotion];
    const config = EMOTION_CONFIG[selectedEmotion as keyof typeof EMOTION_CONFIG] || { name: String(selectedEmotion), emoji: '🙂', color: '#9CA3AF' };
    
    return (
      <Modal
        visible={!!selectedEmotion}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEmotion(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 헤더 */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalEmoji}>{config.emoji}</Text>
                <Text style={styles.modalTitle}>
                  {config.name} {reliability.score}/10
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedEmotion(null)}
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* 신뢰도 경고 */}
              <View style={[
                styles.warningBox,
                { backgroundColor: reliability.level === 'high' ? '#E8F5E8' : 
                                  reliability.level === 'medium' ? '#FFF3E0' : '#FFEBEE' }
              ]}>
                <Text style={styles.warningText}>{reliability.warning}</Text>
              </View>

              {/* 분석 근거 */}
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>📊 분석 근거</Text>
                <Text style={styles.analysisText}>
                  • 기록된 날: {reliability.dataPoints}일 (권장: 5일 이상)
                </Text>
                <Text style={styles.analysisText}>
                  • 데이터 품질: {reliability.quality === 'good' ? '좋음' : 
                                  reliability.quality === 'fair' ? '보통' : '부족'}
                </Text>
                <Text style={styles.analysisText}>
                  • 트렌드: {reliability.trend === 'up' ? '상승세' : 
                             reliability.trend === 'down' ? '하락세' : '안정적'}
                </Text>
              </View>

              {/* 개선 방법 */}
              {reliability.advice.length > 0 && (
                <View style={styles.adviceSection}>
                  <Text style={styles.sectionTitle}>💡 더 정확한 분석을 위해</Text>
                  {reliability.advice.map((advice, index) => (
                    <Text key={index} style={styles.adviceText}>
                      {index + 1}. {advice}
                    </Text>
                  ))}
                </View>
              )}

              {/* 도움말 */}
              <View style={styles.helpSection}>
                <Text style={styles.helpText}>
                  💭 이 분석은 참고용입니다. 더 정확한 결과를 위해 꾸준히 감정을 기록해주세요.
                </Text>
              </View>

              {/* 피드백 */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>❓ 이 분석이 도움되었나요?</Text>
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity style={styles.feedbackButton}>
                    <Text style={styles.feedbackButtonText}>👍 도움됨</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.feedbackButton}>
                    <Text style={styles.feedbackButtonText}>👎 아니요</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>감정 분석 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 차트 헤더 */}
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>📈 이번 주 감정 분석</Text>
        <View style={styles.reliabilityIndicator}>
          <Text style={styles.reliabilityText}>
            🟡 신뢰도: 보통 (7일 중 {weekData.length}일 기록)
          </Text>
        </View>
      </View>

      {/* 감정 차트들 */}
      <View style={styles.emotionList}>
        {Object.entries(emotionScores).map(([emotionType, reliability]) =>
          renderEmotionBar(emotionType, reliability)
        )}
      </View>

      {/* 상세 모달 */}
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 8,
  },
  reliabilityIndicator: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  reliabilityText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '500',
  },
  emotionList: {
    gap: 12,
  },
  emotionContainer: {
    position: 'relative',
    paddingVertical: 8,
  },
  emotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 20,
    marginRight: 8,
  },
  emotionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4E37',
    flex: 1,
  },
  emotionScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5D4E37',
  },
  barContainer: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  emotionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  trendText: {
    fontSize: 14,
  },
  infoIcon: {
    position: 'absolute',
    top: 8,
    right: 0,
    fontSize: 14,
    color: '#8D7A65',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8D7A65',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxHeight: '80%',
    minWidth: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4E37',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: '#8D7A65',
  },
  warningBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5D4E37',
  },
  analysisSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#8D7A65',
    marginBottom: 4,
  },
  adviceSection: {
    marginBottom: 16,
  },
  adviceText: {
    fontSize: 14,
    color: '#5D4E37',
    marginBottom: 6,
  },
  helpSection: {
    backgroundColor: '#F7F3E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#8D7A65',
    fontStyle: 'italic',
  },
  feedbackSection: {
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4E37',
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
  },
  feedbackButtonText: {
    fontSize: 12,
    color: '#5D4E37',
  },
});