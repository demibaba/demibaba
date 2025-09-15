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
import { auth, db } from '@/config/firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import {
  calculateEmotionReliability,
  EMOTION_CONFIG,
  type DiaryData as ReliabilityDiaryData,
  type EmotionReliability
} from '@/utils/emotionReliability';

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
      const allDiaries: ReliabilityDiaryData[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date,
          emotions: data.emotions,
          text: data.text,
          createdAt: data.createdAt,
          ...data
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
      Object.keys(EMOTION_CONFIG).forEach(emotionType => {
        // weekData를 라이브러리의 DiaryData 형태로 최소 변환
        const normalizedCurrentWeek: ReliabilityDiaryData[] = weekData.map(d => ({
          date: d.date,
          emotions: Array.isArray(d.emotions) ? d.emotions : [],
          text: d.text ?? '',
          // createdAt은 신뢰도 계산에서 직접 사용하지 않으므로 더미로 채움
          // 타입 호환을 위한 최소 값 (Timestamp와 형 일치 필요 없음: 내부에서 참조하지 않음)
          createdAt: undefined as any,
        }));

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
    const config = EMOTION_CONFIG[emotionType as keyof typeof EMOTION_CONFIG];
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
    const config = EMOTION_CONFIG[selectedEmotion as keyof typeof EMOTION_CONFIG];
    
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