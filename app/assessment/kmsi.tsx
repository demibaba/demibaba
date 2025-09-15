// app/assessment/kmsi.tsx - 한국판 결혼만족도 검사
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../config/firebaseConfig';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import DefaultText from '../../components/DefaultText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// K-MSI 문항 (부부 관계 특화)
const KMSI_QUESTIONS = [
  {
    id: 1,
    category: '전반적 만족',
    text: "배우자와의 관계에 전반적으로 만족하십니까?",
  },
  {
    id: 2,
    category: '정서적 친밀감',
    text: "배우자가 나의 감정을 잘 이해해준다고 느끼십니까?",
  },
  {
    id: 3,
    category: '의사소통',
    text: "배우자와 대화가 잘 통한다고 생각하십니까?",
  },
  {
    id: 4,
    category: '갈등 해결',
    text: "의견 차이가 있을 때 원만하게 해결하십니까?",
  },
  {
    id: 5,
    category: '애정 표현',
    text: "배우자가 충분한 애정을 표현한다고 느끼십니까?",
  },
  {
    id: 6,
    category: '신뢰',
    text: "배우자를 신뢰하고 의지할 수 있습니까?",
  },
  {
    id: 7,
    category: '시간 공유',
    text: "배우자와 함께 보내는 시간이 충분하다고 생각하십니까?",
  },
  {
    id: 8,
    category: '가사 분담',
    text: "가사일 분담이 공평하게 이루어지고 있습니까?",
  },
  {
    id: 9,
    category: '경제적 만족',
    text: "경제적 문제에 대해 배우자와 의견이 일치합니까?",
  },
  {
    id: 10,
    category: '성생활',
    text: "부부간의 친밀한 관계에 만족하십니까?",
  },
  {
    id: 11,
    category: '자녀 양육',
    text: "자녀 양육에 대해 배우자와 의견이 일치합니까?",
    optional: true, // 자녀가 없는 경우 건너뛰기
  },
  {
    id: 12,
    category: '시댁/처가',
    text: "시댁/처가와의 관계에서 배우자가 나를 지지해줍니까?",
  },
  {
    id: 13,
    category: '개인 시간',
    text: "배우자가 나의 개인적인 시간을 존중해줍니까?",
  },
  {
    id: 14,
    category: '성장',
    text: "배우자와 함께 성장하고 있다고 느끼십니까?",
  },
  {
    id: 15,
    category: '미래 계획',
    text: "배우자와 미래를 함께 계획하고 있습니까?",
  },
  {
    id: 16,
    category: '행복감',
    text: "배우자와 함께 있을 때 행복하십니까?",
  },
];

// 점수 옵션 (5점 척도)
const SCORE_OPTIONS = [
  { value: 5, label: "매우 그렇다", emoji: "😊", color: '#4CAF50' },
  { value: 4, label: "그렇다", emoji: "🙂", color: '#66BB6A' },
  { value: 3, label: "보통이다", emoji: "😐", color: '#FFA726' },
  { value: 2, label: "아니다", emoji: "😕", color: '#FF7043' },
  { value: 1, label: "전혀 아니다", emoji: "😔", color: '#EF5350' },
];

// 결과 해석
const getResultInterpretation = (totalScore: number, maxScore: number) => {
  const percentage = (totalScore / maxScore) * 100;
  
  if (percentage >= 80) {
    return {
      level: '매우 만족',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      message: '부부 관계가 매우 건강하고 만족스러운 상태입니다.',
      recommendation: '현재의 긍정적인 관계를 계속 유지하세요. 서로에 대한 감사를 표현하는 것을 잊지 마세요.',
      emoji: '💚',
    };
  } else if (percentage >= 60) {
    return {
      level: '만족',
      color: '#66BB6A',
      bgColor: '#F1F8E9',
      message: '전반적으로 만족스러운 관계를 유지하고 있습니다.',
      recommendation: '좋은 관계입니다. 조금 더 노력하면 더욱 행복한 부부가 될 수 있어요.',
      emoji: '💙',
    };
  } else if (percentage >= 40) {
    return {
      level: '보통',
      color: '#FFA726',
      bgColor: '#FFF3E0',
      message: '관계 개선이 필요한 부분들이 있습니다.',
      recommendation: '서로의 마음을 나누는 시간을 더 가져보세요. 토닥토닥이 도와드릴게요.',
      emoji: '💛',
    };
  } else if (percentage >= 20) {
    return {
      level: '불만족',
      color: '#FF7043',
      bgColor: '#FBE9E7',
      message: '관계에서 어려움을 겪고 계신 것 같습니다.',
      recommendation: '부부 상담을 고려해보시는 것이 좋겠습니다. 전문가의 도움이 필요할 수 있어요.',
      emoji: '🧡',
    };
  } else {
    return {
      level: '매우 불만족',
      color: '#EF5350',
      bgColor: '#FFEBEE',
      message: '관계가 많이 힘든 상태입니다.',
      recommendation: '전문 부부 상담을 강력히 권유드립니다. 혼자 해결하기 어려운 상황일 수 있어요.',
      emoji: '❤️‍🩹',
    };
  }
};

export default function KMSIAssessment() {
  const router = useRouter();
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showResult, setShowResult] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skipChildQuestion, setSkipChildQuestion] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('');

  // 답변 선택
  const selectAnswer = (questionId: number, score: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: score,
    }));

    // 현재 질문의 카테고리 업데이트
    const question = KMSI_QUESTIONS.find(q => q.id === questionId);
    if (question) {
      setCurrentCategory(question.category);
    }
  };

  // 자녀 관련 질문 건너뛰기
  const handleSkipChild = () => {
    setSkipChildQuestion(true);
    // 11번 문항 건너뛰기
    const filteredQuestions = KMSI_QUESTIONS.filter(q => q.id !== 11);
    if (Object.keys(answers).length === filteredQuestions.length) {
      handleSubmit();
    }
  };

  // 모든 질문에 답했는지 확인
  const isCompleted = () => {
    const requiredQuestions = skipChildQuestion 
      ? KMSI_QUESTIONS.filter(q => q.id !== 11)
      : KMSI_QUESTIONS;
    return Object.keys(answers).length === requiredQuestions.length;
  };

  // 결과 계산 및 저장
  const handleSubmit = async () => {
    if (!isCompleted()) {
      Alert.alert('알림', '모든 질문에 답해주세요.');
      return;
    }

    setLoading(true);
    
    // 총점 계산
    const score = Object.values(answers).reduce((sum, val) => sum + val, 0);
    const maxScore = Object.keys(answers).length * 5; // 각 문항 최대 5점
    setTotalScore(score);
    
    // Firebase에 저장
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        const kmsiData = {
          scores: answers,
          totalScore: score,
          maxPossibleScore: maxScore,
          percentage: Math.round((score / maxScore) * 100),
          completedAt: new Date().toISOString(),
          interpretation: getResultInterpretation(score, maxScore).level,
          skipChildQuestion,
        };
        
        if (userDoc.exists()) {
          await updateDoc(userRef, {
            kmsi: kmsiData,
            assessmentsCompleted: {
              ...userDoc.data().assessmentsCompleted,
              kmsi: true,
            },
          });
        } else {
          await setDoc(userRef, {
            kmsi: kmsiData,
            assessmentsCompleted: {
              kmsi: true,
            },
          }, { merge: true });
        }
        
        // 배우자에게도 알림 (옵션)
        const userData = userDoc.data();
        if (userData?.spouseId) {
          const spouseRef = doc(db, 'users', userData.spouseId);
          await updateDoc(spouseRef, {
            spouseCompletedKMSI: true,
            lastUpdated: new Date().toISOString(),
          });
        }
        
        console.log('K-MSI 결과 저장 완료');
      } catch (error) {
        console.error('K-MSI 결과 저장 오류:', error);
      }
    }
    
    setShowResult(true);
    setLoading(false);
  };

  // 다음 단계로 이동
  const handleNext = () => {
    router.push('/calendar' as any);
  };

  if (showResult) {
    const maxScore = Object.keys(answers).length * 5;
    const result = getResultInterpretation(totalScore, maxScore);
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <View style={[styles.resultIconContainer, { backgroundColor: result.bgColor }]}>
              <DefaultText style={styles.resultEmoji}>{result.emoji}</DefaultText>
            </View>
            <DefaultText style={styles.resultTitle}>관계 만족도 결과</DefaultText>
            <View style={[styles.resultScoreCard, { backgroundColor: result.bgColor }]}>
              <DefaultText style={[styles.resultScore, { color: result.color }]}>
                {percentage}%
              </DefaultText>
              <DefaultText style={[styles.resultLevel, { color: result.color }]}>
                {result.level}
              </DefaultText>
            </View>
            <DefaultText style={styles.resultScoreDetail}>
              {totalScore}점 / {maxScore}점
            </DefaultText>
          </View>
          
          <View style={styles.resultBody}>
            <View style={styles.messageCard}>
              <DefaultText style={styles.messageTitle}>💑 관계 분석</DefaultText>
              <DefaultText style={styles.messageText}>{result.message}</DefaultText>
            </View>
            
            <View style={[styles.recommendCard, { backgroundColor: '#F0F7FF' }]}>
              <Ionicons name="bulb" size={24} color="#4A90E2" />
              <DefaultText style={styles.recommendTitle}>추천 사항</DefaultText>
              <DefaultText style={styles.recommendText}>{result.recommendation}</DefaultText>
            </View>

            {/* 카테고리별 점수 */}
            <View style={styles.categoryCard}>
              <DefaultText style={styles.categoryTitle}>영역별 만족도</DefaultText>
              {['정서적 친밀감', '의사소통', '갈등 해결', '애정 표현'].map(category => {
                const categoryQuestions = KMSI_QUESTIONS.filter(q => q.category === category);
                const categoryScore = categoryQuestions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);
                const categoryMax = categoryQuestions.length * 5;
                const categoryPercentage = categoryMax > 0 ? Math.round((categoryScore / categoryMax) * 100) : 0;
                
                return (
                  <View key={category} style={styles.categoryItem}>
                    <DefaultText style={styles.categoryName}>{category}</DefaultText>
                    <View style={styles.categoryBarContainer}>
                      <View 
                        style={[
                          styles.categoryBar, 
                          { 
                            width: `${categoryPercentage}%`,
                            backgroundColor: categoryPercentage >= 60 ? '#4CAF50' : '#FFA726'
                          }
                        ]} 
                      />
                    </View>
                    <DefaultText style={styles.categoryPercent}>{categoryPercentage}%</DefaultText>
                  </View>
                );
              })}
            </View>
            
            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle-outline" size={20} color="#8A94A6" />
              <DefaultText style={styles.disclaimerText}>
                이 검사는 부부 관계 만족도를 측정하는 자가진단 도구입니다.
                전문적인 상담이 필요하신 경우 전문가와 상담하세요.
              </DefaultText>
            </View>
          </View>
          
          <View style={styles.resultFooter}>
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNext}
            >
              <DefaultText style={styles.nextButtonText}>
                토닥토닥 시작하기
              </DefaultText>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(Object.keys(answers).length / KMSI_QUESTIONS.length) * 100}%` }
              ]} 
            />
          </View>
          <DefaultText style={styles.headerTitle}>부부 관계 만족도 검사</DefaultText>
          <DefaultText style={styles.headerSubtitle}>
            현재 부부 관계에 대한 솔직한 생각을 알려주세요
          </DefaultText>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <DefaultText style={styles.badgeText}>K-MSI</DefaultText>
            </View>
            <DefaultText style={styles.questionCount}>
              {Object.keys(answers).length} / {skipChildQuestion ? KMSI_QUESTIONS.length - 1 : KMSI_QUESTIONS.length}
            </DefaultText>
          </View>
        </View>

        {/* 질문 목록 */}
        <View style={styles.questionsContainer}>
          {KMSI_QUESTIONS.map((question) => {
            // 자녀 문항 건너뛰기
            if (question.id === 11 && skipChildQuestion) {
              return null;
            }

            return (
              <View key={question.id} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <View style={styles.questionNumber}>
                    <DefaultText style={styles.questionNumberText}>
                      Q{question.id}
                    </DefaultText>
                  </View>
                  <View style={styles.questionContent}>
                    <DefaultText style={styles.categoryLabel}>
                      {question.category}
                    </DefaultText>
                    <DefaultText style={styles.questionText}>
                      {question.text}
                    </DefaultText>
                  </View>
                </View>
                
                {question.optional && (
                  <TouchableOpacity 
                    style={styles.skipButton}
                    onPress={handleSkipChild}
                  >
                    <DefaultText style={styles.skipButtonText}>
                      자녀가 없어요 (건너뛰기)
                    </DefaultText>
                  </TouchableOpacity>
                )}
                
                <View style={styles.optionsContainer}>
                  {SCORE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        answers[question.id] === option.value && {
                          backgroundColor: option.color + '20',
                          borderColor: option.color,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => selectAnswer(question.id, option.value)}
                      activeOpacity={0.7}
                    >
                      <DefaultText style={styles.optionEmoji}>
                        {option.emoji}
                      </DefaultText>
                      <DefaultText 
                        style={[
                          styles.optionText,
                          answers[question.id] === option.value && styles.selectedOptionText,
                        ]}
                      >
                        {option.label}
                      </DefaultText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* 제출 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isCompleted() && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isCompleted() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <DefaultText style={styles.submitButtonText}>분석 중...</DefaultText>
            ) : (
              <>
                <DefaultText style={styles.submitButtonText}>
                  결과 확인하기
                </DefaultText>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  
  // 헤더 스타일
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E8ECEF',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8A94A6',
    lineHeight: 20,
    marginBottom: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  questionCount: {
    fontSize: 14,
    color: '#8A94A6',
    fontWeight: '500',
  },
  
  // 질문 카드 스타일
  questionsContainer: {
    padding: 16,
    gap: 16,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  questionNumber: {
    width: 32,
    height: 32,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A90E2',
  },
  questionContent: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 4,
  },
  questionText: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 24,
    fontWeight: '500',
  },
  
  // 옵션 스타일
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 96) / 3,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 12,
    color: '#4E5969',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  
  // 건너뛰기 버튼
  skipButton: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  skipButtonText: {
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '600',
  },
  
  // 푸터 스타일
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#BCC2CE',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // 결과 화면 스타일
  resultContainer: {
    flex: 1,
    padding: 20,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultEmoji: {
    fontSize: 48,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  resultScoreCard: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  resultScore: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultLevel: {
    fontSize: 18,
    fontWeight: '600',
  },
  resultScoreDetail: {
    fontSize: 14,
    color: '#8A94A6',
    marginTop: 8,
  },
  
  resultBody: {
    gap: 16,
    marginBottom: 32,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#4E5969',
    lineHeight: 22,
  },
  recommendCard: {
    flexDirection: 'column',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  recommendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  recommendText: {
    fontSize: 14,
    color: '#4E5969',
    lineHeight: 22,
  },
  
  // 카테고리별 점수
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 13,
    color: '#4E5969',
    width: 80,
  },
  categoryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F2F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryPercent: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#8A94A6',
    lineHeight: 18,
  },
  
  resultFooter: {
    gap: 12,
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});