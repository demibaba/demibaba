// app/onboarding/phq9.tsx - PHQ-9 우울 검사 (이동됨)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../config/firebaseConfig';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import DefaultText from '../../components/DefaultText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// PHQ-9 질문 목록
const PHQ9_QUESTIONS = [
  {
    id: 1,
    text: "일을 하는 것에 대한 흥미나 재미가 거의 없음",
  },
  {
    id: 2,
    text: "기분이 가라앉거나, 우울하거나, 희망이 없다고 느낌",
  },
  {
    id: 3,
    text: "잠들기 어렵거나 자꾸 깨거나, 혹은 너무 많이 잠",
  },
  {
    id: 4,
    text: "피곤하고 기운이 거의 없음",
  },
  {
    id: 5,
    text: "식욕이 줄거나 혹은 너무 많이 먹음",
  },
  {
    id: 6,
    text: "내 자신이 실패자로 느껴지거나, 자신과 가족을 실망시켰다고 느낌",
  },
  {
    id: 7,
    text: "신문을 읽거나 TV를 보는 것과 같은 일상적인 일에 집중하기 어려움",
  },
  {
    id: 8,
    text: "다른 사람들이 알아챌 정도로 말과 행동이 느려지거나, 반대로 안절부절 못함",
  },
  {
    id: 9,
    text: "차라리 죽는 것이 낫겠다고 생각하거나, 자해하고 싶다는 생각",
  },
];

// 점수 옵션
const SCORE_OPTIONS = [
  { value: 0, label: "전혀 없음", color: '#E8F5E9' },
  { value: 1, label: "며칠", color: '#FFF3E0' },
  { value: 2, label: "일주일 이상", color: '#FFE0B2' },
  { value: 3, label: "거의 매일", color: '#FFCCBC' },
];

// 결과 해석
const getResultInterpretation = (totalScore: number) => {
  if (totalScore >= 20) {
    return {
      level: '심각',
      color: '#EF5350',
      bgColor: '#FFEBEE',
      message: '현재 심각한 우울 증상이 있을 수 있습니다.',
      recommendation: '전문가 상담을 강력히 권유드립니다. 도움이 필요하시면 언제든 연락주세요.',
      icon: 'alert-circle',
    };
  } else if (totalScore >= 15) {
    return {
      level: '중등도',
      color: '#FF7043',
      bgColor: '#FBE9E7',
      message: '중간 정도의 우울 증상이 있을 수 있습니다.',
      recommendation: '전문가 상담을 고려해보시는 것이 좋겠습니다.',
      icon: 'warning',
    };
  } else if (totalScore >= 10) {
    return {
      level: '경미',
      color: '#FFA726',
      bgColor: '#FFF3E0',
      message: '가벼운 우울 증상이 있을 수 있습니다.',
      recommendation: '일상에서 스트레스 관리와 자기 돌봄이 중요합니다.',
      icon: 'information-circle',
    };
  } else if (totalScore >= 5) {
    return {
      level: '최소',
      color: '#66BB6A',
      bgColor: '#E8F5E9',
      message: '최소한의 우울 증상이 있습니다.',
      recommendation: '현재 상태를 잘 유지하시면 좋겠습니다.',
      icon: 'checkmark-circle',
    };
  } else {
    return {
      level: '정상',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      message: '우울 증상이 거의 없습니다.',
      recommendation: '정신 건강이 양호한 상태입니다. 계속 유지하세요!',
      icon: 'happy',
    };
  }
};

export default function PHQ9Screen() {
  const router = useRouter();
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showResult, setShowResult] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasShownCrisisAlert, setHasShownCrisisAlert] = useState(false);

  const callNumber = async (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('연결 불가', '전화 앱을 열 수 없습니다.');
      }
    } catch (e) {
      Alert.alert('오류', '전화 연결 중 문제가 발생했습니다.');
    }
  };

  const promptCrisisHelp = () => {
    Alert.alert(
      '💚 도움이 필요하신가요?',
      '힘든 마음을 혼자 견디지 마세요.\n전문가와 상담하시길 권해드립니다.',
      [
        {
          text: '상담 센터 연결',
          onPress: () => {
            Alert.alert(
              '연결할 번호를 선택하세요',
              '필요하신 번호를 선택하면 연결됩니다.',
              [
                { text: '129 (자살예방상담전화)', onPress: () => callNumber('129') },
                { text: '1577-0199 (정신건강 상담전화)', onPress: () => callNumber('15770199') },
                { text: '취소', style: 'cancel' },
              ]
            );
          },
        },
        { text: '나중에', style: 'cancel' },
      ]
    );
  };

  // 답변 선택
  const selectAnswer = (questionId: number, score: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: score,
    }));

    if (questionId === 9 && score >= 2 && !hasShownCrisisAlert) {
      setHasShownCrisisAlert(true);
      promptCrisisHelp();
    }
  };

  // 모든 질문에 답했는지 확인
  const isCompleted = Object.keys(answers).length === PHQ9_QUESTIONS.length;

  // 결과 계산 및 저장
  const handleSubmit = async () => {
    if (!isCompleted) {
      Alert.alert('알림', '모든 질문에 답해주세요.');
      return;
    }

    setLoading(true);
    
    // 총점 계산
    const score = Object.values(answers).reduce((sum, val) => sum + val, 0);
    setTotalScore(score);

    // 9번 문항 고위험 응답 시 알림 (백업 체크)
    if (answers[9] !== undefined && answers[9] >= 2 && !hasShownCrisisAlert) {
      setHasShownCrisisAlert(true);
      promptCrisisHelp();
    }
    
    // Firebase에 저장
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        
        // 기존 사용자 문서 확인
        const userDoc = await getDoc(userRef);
        
        const phq9Data = {
          scores: answers,
          totalScore: score,
          completedAt: new Date().toISOString(),
          interpretation: getResultInterpretation(score).level,
        };
        
        if (userDoc.exists()) {
          // 기존 문서 업데이트
          await updateDoc(userRef, {
            phq9: phq9Data,
            assessmentsCompleted: {
              ...userDoc.data().assessmentsCompleted,
              phq9: true,
            },
          });
        } else {
          // 새 문서 생성
          await setDoc(userRef, {
            phq9: phq9Data,
            assessmentsCompleted: {
              phq9: true,
            },
          }, { merge: true });
        }
        
        console.log('PHQ-9 결과 저장 완료');
      } catch (error) {
        console.error('PHQ-9 결과 저장 오류:', error);
      }
    }
    
    setShowResult(true);
    setLoading(false);
  };

  // 다음 단계로 이동
  const handleNext = () => {
    router.push('/onboarding/results' as any);  // 통합 결과로
  };

  if (showResult) {
    const result = getResultInterpretation(totalScore);
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <View style={[styles.resultIconContainer, { backgroundColor: result.bgColor }]}>
              <Ionicons name={result.icon as any} size={48} color={result.color} />
            </View>
            <DefaultText style={styles.resultTitle}>검사 결과</DefaultText>
            <View style={[styles.resultScoreCard, { backgroundColor: result.bgColor }]}>
              <DefaultText style={[styles.resultScore, { color: result.color }]}>
                {totalScore}점
              </DefaultText>
              <DefaultText style={[styles.resultLevel, { color: result.color }]}>
                {result.level}
              </DefaultText>
            </View>
          </View>
          
          <View style={styles.resultBody}>
            <View style={styles.messageCard}>
              <DefaultText style={styles.messageTitle}>상태 분석</DefaultText>
              <DefaultText style={styles.messageText}>{result.message}</DefaultText>
            </View>
            
            <View style={[styles.recommendCard, { backgroundColor: '#F0F7FF' }]}>
              <Ionicons name="bulb" size={24} color="#4A90E2" />
              <DefaultText style={styles.recommendTitle}>추천 사항</DefaultText>
              <DefaultText style={styles.recommendText}>{result.recommendation}</DefaultText>
            </View>
            
            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle-outline" size={20} color="#8A94A6" />
              <DefaultText style={styles.disclaimerText}>
                이 검사는 의학적 진단이 아닌 선별 목적입니다.
                정확한 진단은 전문가와 상담하세요.
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
                { width: `${(Object.keys(answers).length / PHQ9_QUESTIONS.length) * 100}%` }
              ]} 
            />
          </View>
          <DefaultText style={styles.headerTitle}>기분 상태 체크</DefaultText>
          <DefaultText style={styles.headerSubtitle}>
            지난 2주간 얼마나 자주 다음과 같은 문제들로 불편함을 겪으셨나요?
          </DefaultText>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <DefaultText style={styles.badgeText}>PHQ-9</DefaultText>
            </View>
            <DefaultText style={styles.questionCount}>
              {Object.keys(answers).length} / {PHQ9_QUESTIONS.length}
            </DefaultText>
          </View>
        </View>

        {/* 질문 목록 */}
        <View style={styles.questionsContainer}>
          {PHQ9_QUESTIONS.map((question) => (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={styles.questionNumber}>
                  <DefaultText style={styles.questionNumberText}>
                    Q{question.id}
                  </DefaultText>
                </View>
                <DefaultText style={styles.questionText}>
                  {question.text}
                </DefaultText>
              </View>
              
              <View style={styles.optionsContainer}>
                {SCORE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      answers[question.id] === option.value && {
                        backgroundColor: option.color,
                        borderColor: '#4A90E2',
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => selectAnswer(question.id, option.value)}
                    activeOpacity={0.7}
                  >
                    <DefaultText 
                      style={[
                        styles.optionText,
                        answers[question.id] === option.value && styles.selectedOptionText,
                      ]}
                    >
                      {option.label}
                    </DefaultText>
                    <DefaultText 
                      style={[
                        styles.optionScore,
                        answers[question.id] === option.value && styles.selectedOptionScore,
                      ]}
                    >
                      {option.value}점
                    </DefaultText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* 제출 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isCompleted && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isCompleted || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <DefaultText style={styles.submitButtonText}>저장 중...</DefaultText>
            ) : (
              <>
                <DefaultText style={styles.submitButtonText}>
                  결과 확인하기
                </DefaultText>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => router.push('/calendar' as any)}
          >
            <DefaultText style={styles.skipButtonText}>나중에 하기</DefaultText>
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
  questionText: {
    flex: 1,
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
    minWidth: (SCREEN_WIDTH - 80) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionText: {
    fontSize: 14,
    color: '#4E5969',
    fontWeight: '500',
    marginBottom: 2,
  },
  optionScore: {
    fontSize: 11,
    color: '#8A94A6',
  },
  selectedOptionText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  selectedOptionScore: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  
  // 푸터 스타일
  footer: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
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
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#8A94A6',
    fontWeight: '500',
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


