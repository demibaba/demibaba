// app/onboarding/phq9.tsx - 통일된 디자인 시스템 적용 (2단계)
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

// 통일된 디자인 시스템
const ONBOARDING_THEME = {
  base: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#1A1A1A',
    textSecondary: '#8A94A6',
    border: '#E5E5E5'
  },
  progress: {
    step2: '#BBDEFB', // PHQ-9 - 조금 더 진한 블루
    step2Accent: '#1565C0', // PHQ-9 강조색
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 }
};

// 진행바 컴포넌트
const ProgressHeader: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={progressStyles.container}>
    <Text style={progressStyles.stepText}>2단계: 우울증 검사 (PHQ-9)</Text>
    <Text style={progressStyles.progressText}>{current}/{total}</Text>
    <View style={progressStyles.progressBar}>
      <View 
        style={[
          progressStyles.progressFill, 
          { width: `${(current / total) * 100}%` }
        ]} 
      />
    </View>
    <View style={progressStyles.dots}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            progressStyles.dot,
            { backgroundColor: i < current ? ONBOARDING_THEME.progress.step2Accent : ONBOARDING_THEME.base.border }
          ]}
        />
      ))}
    </View>
  </View>
);

// 완료 피드백 컴포넌트
const CompletionFeedback: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <View style={completionStyles.container}>
    <View style={completionStyles.checkContainer}>
      <View style={completionStyles.checkCircle}>
        <Text style={completionStyles.checkMark}>✓</Text>
      </View>
      <Text style={completionStyles.completionText}>우울증 검사 완료!</Text>
      <Text style={completionStyles.completionSubtext}>결과를 분석 중입니다</Text>
    </View>
  </View>
);

// PHQ-9 질문 목록 (기존과 동일)
const PHQ9_QUESTIONS = [
  { id: 1, text: "일을 하는 것에 대한 흥미나 재미가 거의 없음" },
  { id: 2, text: "기분이 가라앉거나, 우울하거나, 희망이 없다고 느낌" },
  { id: 3, text: "잠들기 어렵거나 자꾸 깨거나, 혹은 너무 많이 잠" },
  { id: 4, text: "피곤하고 기운이 거의 없음" },
  { id: 5, text: "식욕이 줄거나 혹은 너무 많이 먹음" },
  { id: 6, text: "내 자신이 실패자로 느껴지거나, 자신과 가족을 실망시켰다고 느낌" },
  { id: 7, text: "신문을 읽거나 TV를 보는 것과 같은 일상적인 일에 집중하기 어려움" },
  { id: 8, text: "다른 사람들이 알아챌 정도로 말과 행동이 느려지거나, 반대로 안절부절 못함" },
  { id: 9, text: "차라리 죽는 것이 낫겠다고 생각하거나, 자해하고 싶다는 생각" },
];

// 점수 옵션
const SCORE_OPTIONS = [
  { value: 0, label: "전혀 없음", color: '#E8F5E9' },
  { value: 1, label: "며칠", color: '#FFF3E0' },
  { value: 2, label: "일주일 이상", color: '#FFE0B2' },
  { value: 3, label: "거의 매일", color: '#FFCCBC' },
];

// 결과 해석 (기존과 동일)
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
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);
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
    setShowCompletionFeedback(true);
    
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
        const userDoc = await getDoc(userRef);
        
        const phq9Data = {
          scores: answers,
          totalScore: score,
          completedAt: new Date().toISOString(),
          interpretation: getResultInterpretation(score).level,
        };
        
        if (userDoc.exists()) {
          await updateDoc(userRef, {
            phq9: phq9Data,
            assessmentsCompleted: {
              ...userDoc.data().assessmentsCompleted,
              phq9: true,
            },
          });
        } else {
          await setDoc(userRef, {
            phq9: phq9Data,
            assessmentsCompleted: { phq9: true },
          }, { merge: true });
        }
        
        console.log('PHQ-9 결과 저장 완료');
      } catch (error) {
        console.error('PHQ-9 결과 저장 오류:', error);
      }
    }
    
    // 2초 후 결과 화면으로
    setTimeout(() => {
      setShowCompletionFeedback(false);
      setShowResult(true);
      setLoading(false);
    }, 2000);
  };

  // 다음 단계로 이동
  const handleNext = () => {
    router.push('/onboarding/gad7' as any);
  };

  // 완료 피드백 화면
  if (showCompletionFeedback) {
    return (
      <View style={styles.container}>
        <CompletionFeedback onNext={() => {}} />
      </View>
    );
  }

  // 결과 화면
  if (showResult) {
    const result = getResultInterpretation(totalScore);
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <ProgressHeader current={9} total={9} />
          
          <View style={styles.resultHeader}>
            <View style={[styles.resultIconContainer, { backgroundColor: result.bgColor }]}>
              <Ionicons name={result.icon as any} size={48} color={result.color} />
            </View>
            <DefaultText style={styles.resultTitle}>PHQ-9 검사 결과</DefaultText>
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
            
            <View style={styles.recommendCard}>
              <Ionicons name="bulb" size={24} color="#4A90E2" />
              <DefaultText style={styles.recommendTitle}>추천 사항</DefaultText>
              <DefaultText style={styles.recommendText}>{result.recommendation}</DefaultText>
            </View>
            
            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle-outline" size={20} color="#8A94A6" />
              <DefaultText style={styles.disclaimerText}>
                이 검사는 의학적 진단이 아닌 선별 목적입니다. 정확한 진단은 전문가와 상담하세요.
              </DefaultText>
            </View>
          </View>
          
          <View style={styles.resultFooter}>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <DefaultText style={styles.nextButtonText}>다음 단계로 →</DefaultText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 테스트 진행 화면
  return (
    <SafeAreaView style={styles.container}>
      {/* 통일된 헤더 */}
      <View style={[styles.header, { backgroundColor: ONBOARDING_THEME.progress.step2 }]}>
        <DefaultText style={styles.headerTitle}>기분 상태 체크</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          지난 2주간 얼마나 자주 다음과 같은 문제들로 불편함을 겪으셨나요?
        </DefaultText>
      </View>

      {/* 진행바 */}
      <ProgressHeader current={Object.keys(answers).length} total={PHQ9_QUESTIONS.length} />

      <ScrollView showsVerticalScrollIndicator={false}>
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
                        borderColor: ONBOARDING_THEME.progress.step2Accent,
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
                <DefaultText style={styles.submitButtonText}>결과 확인하기</DefaultText>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => router.push('/onboarding/gad7' as any)}
          >
            <DefaultText style={styles.skipButtonText}>건너뛰기</DefaultText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 통일된 스타일
const progressStyles = StyleSheet.create({
  container: {
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    backgroundColor: ONBOARDING_THEME.base.background,
  },
  stepText: {
    fontSize: 12,
    color: ONBOARDING_THEME.progress.step2Accent,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'GmarketSansTTFBold',
  },
  progressText: {
    fontSize: 12,
    color: ONBOARDING_THEME.base.textSecondary,
    textAlign: 'center',
    marginBottom: ONBOARDING_THEME.spacing.sm,
    fontFamily: 'GmarketSansTTFMedium',
  },
  progressBar: {
    height: 4,
    backgroundColor: ONBOARDING_THEME.base.border,
    borderRadius: 2,
    marginBottom: ONBOARDING_THEME.spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: ONBOARDING_THEME.progress.step2Accent,
    borderRadius: 2,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ONBOARDING_THEME.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

const completionStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ONBOARDING_THEME.base.background,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
  },
  checkContainer: {
    alignItems: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ONBOARDING_THEME.progress.step2Accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  checkMark: {
    fontSize: 36,
    color: '#FFFFFF',
    fontFamily: 'GmarketSansTTFBold',
  },
  completionText: {
    fontSize: 20,
    color: ONBOARDING_THEME.base.text,
    fontFamily: 'GmarketSansTTFBold',
    marginBottom: ONBOARDING_THEME.spacing.sm,
  },
  completionSubtext: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ONBOARDING_THEME.base.background,
  },
  
  // 헤더 스타일 (통일됨)
  header: {
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    paddingTop: 60,
    paddingBottom: ONBOARDING_THEME.spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: ONBOARDING_THEME.spacing.sm,
  },
  headerSubtitle: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.textSecondary,
    textAlign: 'center',
    fontFamily: 'GmarketSansTTFMedium',
    lineHeight: 24,
  },
  
  // 질문 카드 스타일
  questionsContainer: {
    padding: ONBOARDING_THEME.spacing.lg,
    gap: ONBOARDING_THEME.spacing.md,
  },
  questionCard: {
    backgroundColor: ONBOARDING_THEME.base.surface,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    padding: ONBOARDING_THEME.spacing.lg,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: ONBOARDING_THEME.spacing.md,
    gap: ONBOARDING_THEME.spacing.md,
  },
  questionNumber: {
    width: 32,
    height: 32,
    backgroundColor: ONBOARDING_THEME.progress.step2,
    borderRadius: ONBOARDING_THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: {
    fontSize: 14,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.progress.step2Accent,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    color: ONBOARDING_THEME.base.text,
    lineHeight: 24,
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  // 옵션 스타일
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ONBOARDING_THEME.spacing.sm,
  },
  optionButton: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 80) / 2,
    backgroundColor: ONBOARDING_THEME.base.background,
    borderRadius: ONBOARDING_THEME.borderRadius.md,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    paddingHorizontal: ONBOARDING_THEME.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  optionText: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.text,
    fontFamily: 'GmarketSansTTFMedium',
    marginBottom: 2,
  },
  optionScore: {
    fontSize: 11,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
  },
  selectedOptionText: {
    color: ONBOARDING_THEME.base.text,
    fontFamily: 'GmarketSansTTFBold',
  },
  selectedOptionScore: {
    color: ONBOARDING_THEME.progress.step2Accent,
    fontFamily: 'GmarketSansTTFBold',
  },
  
  // 푸터 스타일
  footer: {
    padding: ONBOARDING_THEME.spacing.lg,
    paddingBottom: 40,
    gap: ONBOARDING_THEME.spacing.md,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: ONBOARDING_THEME.progress.step2Accent,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ONBOARDING_THEME.spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: '#BCC2CE',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: ONBOARDING_THEME.spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  // 결과 화면 스타일
  resultContainer: {
    paddingBottom: 40,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.xl,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
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
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: 16,
  },
  resultScoreCard: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    alignItems: 'center',
  },
  resultScore: {
    fontSize: 36,
    fontFamily: 'GmarketSansTTFBold',
    marginBottom: 4,
  },
  resultLevel: {
    fontSize: 18,
    fontFamily: 'GmarketSansTTFBold',
  },
  
  resultBody: {
    gap: ONBOARDING_THEME.spacing.md,
    marginBottom: ONBOARDING_THEME.spacing.xl,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
  },
  messageCard: {
    backgroundColor: ONBOARDING_THEME.base.surface,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    padding: ONBOARDING_THEME.spacing.lg,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  messageTitle: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: ONBOARDING_THEME.spacing.sm,
  },
  messageText: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    lineHeight: 22,
    fontFamily: 'GmarketSansTTFMedium',
  },
  recommendCard: {
    flexDirection: 'column',
    padding: ONBOARDING_THEME.spacing.lg,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    gap: ONBOARDING_THEME.spacing.md,
    backgroundColor: '#F0F7FF',
  },
  recommendTitle: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
  },
  recommendText: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    lineHeight: 22,
    fontFamily: 'GmarketSansTTFMedium',
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: ONBOARDING_THEME.base.surface,
    padding: ONBOARDING_THEME.spacing.md,
    borderRadius: ONBOARDING_THEME.borderRadius.md,
    gap: ONBOARDING_THEME.spacing.md,
    alignItems: 'center',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: ONBOARDING_THEME.base.textSecondary,
    lineHeight: 18,
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  resultFooter: {
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
  },
  nextButton: {
    backgroundColor: ONBOARDING_THEME.progress.step2Accent,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
    color: '#FFFFFF',
  },
});