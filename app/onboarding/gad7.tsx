// app/onboarding/gad7.tsx - 완전 통일된 버전 (4단계)
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Text,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../config/firebaseConfig';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import DefaultText from '../../components/DefaultText';

const { width } = Dimensions.get('window');

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
    step4: '#64B5F6', // GAD-7 - 진한 블루
    step4Accent: '#1976D2',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 }
};

// 진행바 컴포넌트
const ProgressHeader: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={progressStyles.container}>
    <Text style={progressStyles.stepText}>4단계: 불안장애 검사 (GAD-7)</Text>
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
            { backgroundColor: i < current ? ONBOARDING_THEME.progress.step4Accent : ONBOARDING_THEME.base.border }
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
      <Text style={completionStyles.completionText}>불안장애 검사 완료!</Text>
      <Text style={completionStyles.completionSubtext}>결과를 분석했습니다</Text>
    </View>
  </View>
);

// GAD-7 질문 및 옵션 (애착유형과 동일한 구조)
interface GAD7Option {
  text: string;
  value: number;
}

interface GAD7Question {
  id: number;
  question: string;
  options: GAD7Option[];
}

const GAD7_QUESTIONS: GAD7Question[] = [
  {
    id: 1,
    question: "초조하거나 불안하거나 조마조마하게 느낀다",
    options: [
      { text: "전혀 없음", value: 0 },
      { text: "며칠 동안", value: 1 },
      { text: "일주일 이상", value: 2 },
      { text: "거의 매일", value: 3 }
    ]
  },
  {
    id: 2,
    question: "걱정하는 것을 멈추거나 조절할 수가 없다",
    options: [
      { text: "전혀 없음", value: 0 },
      { text: "며칠 동안", value: 1 },
      { text: "일주일 이상", value: 2 },
      { text: "거의 매일", value: 3 }
    ]
  },
  {
    id: 3,
    question: "여러 가지 것들에 대해 걱정을 너무 많이 한다",
    options: [
      { text: "전혀 없음", value: 0 },
      { text: "며칠 동안", value: 1 },
      { text: "일주일 이상", value: 2 },
      { text: "거의 매일", value: 3 }
    ]
  },
  {
    id: 4,
    question: "편하게 있기가 어렵다",
    options: [
      { text: "전혀 없음", value: 0 },
      { text: "며칠 동안", value: 1 },
      { text: "일주일 이상", value: 2 },
      { text: "거의 매일", value: 3 }
    ]
  },
  {
    id: 5,
    question: "너무 안절부절못해서 가만히 있기가 힘들다",
    options: [
      { text: "전혀 없음", value: 0 },
      { text: "며칠 동안", value: 1 },
      { text: "일주일 이상", value: 2 },
      { text: "거의 매일", value: 3 }
    ]
  },
  {
    id: 6,
    question: "쉽게 짜증이 나거나 쉽게 성을 낸다",
    options: [
      { text: "전혀 없음", value: 0 },
      { text: "며칠 동안", value: 1 },
      { text: "일주일 이상", value: 2 },
      { text: "거의 매일", value: 3 }
    ]
  },
  {
    id: 7,
    question: "마치 끔찍한 일이 생길 것처럼 두렵게 느껴진다",
    options: [
      { text: "전혀 없음", value: 0 },
      { text: "며칠 동안", value: 1 },
      { text: "일주일 이상", value: 2 },
      { text: "거의 매일", value: 3 }
    ]
  }
];

// 결과 해석
const getResultInterpretation = (totalScore: number) => {
  if (totalScore >= 15) {
    return {
      level: '심한 불안',
      color: '#EF5350',
      bgColor: '#FFEBEE',
      message: '심각한 수준의 불안 증상을 경험하고 있습니다.',
      recommendation: '전문가 상담을 강력히 권장합니다.',
      icon: 'alert-circle',
    };
  } else if (totalScore >= 10) {
    return {
      level: '중간 불안',
      color: '#FF7043',
      bgColor: '#FBE9E7',
      message: '중등도의 불안 증상이 있습니다.',
      recommendation: '전문가 상담을 고려해보시기 바랍니다.',
      icon: 'warning',
    };
  } else if (totalScore >= 5) {
    return {
      level: '가벼운 불안',
      color: '#FFA726',
      bgColor: '#FFF3E0',
      message: '경미한 불안 증상이 있습니다.',
      recommendation: '스트레스 관리 방법을 시도해보세요.',
      icon: 'information-circle',
    };
  } else {
    return {
      level: '정상',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      message: '불안 증상이 거의 없거나 정상 범위입니다.',
      recommendation: '현재 불안 수준은 양호합니다.',
      icon: 'checkmark-circle',
    };
  }
};

export default function GAD7Assessment() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromProfile = (params as any)?.fromProfile === 'true';
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(7).fill(-1));
  const [showResult, setShowResult] = useState(false);
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleAnswer = async (selectedOption: GAD7Option) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedOption.value;
    setAnswers(newAnswers);
    
    if (currentQuestion < GAD7_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    } else {
      // 테스트 완료
      const totalScore = newAnswers.reduce((sum, val) => sum + val, 0);
      const result = getResultInterpretation(totalScore);
      setTestResult({ ...result, totalScore });
      setShowCompletionFeedback(true);
      
      // Firebase에 저장
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          const gad7Data = {
            totalScore: totalScore,
            severity: result.level,
            interpretation: result.message,
            completedAt: new Date().toISOString(),
          };
          
          if (userDoc.exists()) {
            await updateDoc(userRef, {
              gad7: gad7Data,
              assessmentsCompleted: {
                ...userDoc.data().assessmentsCompleted,
                gad7: true,
              },
            });
          } else {
            await setDoc(userRef, {
              gad7: gad7Data,
              assessmentsCompleted: { gad7: true },
            }, { merge: true });
          }
          
          console.log('GAD-7 결과 저장 완료');
        }
      } catch (error) {
        console.error('GAD-7 결과 저장 실패:', error);
      }

      // 2초 후 결과 화면으로
      setTimeout(() => {
        setShowCompletionFeedback(false);
        setShowResult(true);
      }, 2000);
    }
  };

  const handleNext = () => {
    if (fromProfile) {
      router.replace('/profile' as any);
    } else {
      router.push('/onboarding/psychology-test' as any);
    }
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
  if (showResult && testResult) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.resultContainer}>
          <ProgressHeader current={7} total={7} />
          
          <View style={styles.resultHeader}>
            <View style={[styles.resultIconContainer, { backgroundColor: testResult.bgColor }]}>
              <Ionicons name={testResult.icon as any} size={48} color={testResult.color} />
            </View>
            <DefaultText style={styles.resultTitle}>GAD-7 검사 결과</DefaultText>
            <View style={[styles.resultScoreCard, { backgroundColor: testResult.bgColor }]}>
              <DefaultText style={[styles.resultScore, { color: testResult.color }]}>
                {testResult.totalScore}점
              </DefaultText>
              <DefaultText style={[styles.resultLevel, { color: testResult.color }]}>
                {testResult.level}
              </DefaultText>
            </View>
          </View>
          
          <View style={styles.resultBody}>
            <View style={styles.messageCard}>
              <DefaultText style={styles.messageTitle}>상태 분석</DefaultText>
              <DefaultText style={styles.messageText}>{testResult.message}</DefaultText>
            </View>
            
            <View style={styles.recommendCard}>
              <Ionicons name="bulb" size={24} color="#4A90E2" />
              <DefaultText style={styles.recommendTitle}>추천 사항</DefaultText>
              <DefaultText style={styles.recommendText}>{testResult.recommendation}</DefaultText>
            </View>
            
            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle-outline" size={20} color="#8A94A6" />
              <DefaultText style={styles.disclaimerText}>
                이 검사는 의학적 진단이 아닌 선별 목적입니다. 정확한 진단은 전문가와 상담하세요.
              </DefaultText>
            </View>
          </View>
          
          <TouchableOpacity style={styles.continueButton} onPress={handleNext}>
            <DefaultText style={styles.continueButtonText}>
              {fromProfile ? '프로필로 돌아가기' : '성격 테스트하기 →'}
            </DefaultText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // 테스트 진행 화면
  return (
    <View style={styles.container}>
      {/* 통일된 헤더 */}
      <View style={[styles.header, { backgroundColor: ONBOARDING_THEME.progress.step4 }]}>
        <DefaultText style={styles.headerTitle}>불안 상태 체크</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          지난 2주 동안 다음과 같은 문제들로 얼마나 자주 방해받았습니까?
        </DefaultText>
      </View>

      {/* 진행바 */}
      <ProgressHeader current={currentQuestion + 1} total={GAD7_QUESTIONS.length} />
      
      {/* 질문 영역 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <DefaultText style={styles.questionText}>
            {GAD7_QUESTIONS[currentQuestion]?.question ?? ''}
          </DefaultText>
        
        <View style={styles.optionsContainer}>
           {(GAD7_QUESTIONS[currentQuestion]?.options ?? []).map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleAnswer(option)}
            >
              <DefaultText style={styles.optionText}>{option.text}</DefaultText>
              <DefaultText style={styles.optionScore}>({option.value}점)</DefaultText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// 스타일 (완전히 통일됨)
const progressStyles = StyleSheet.create({
  container: {
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    backgroundColor: ONBOARDING_THEME.base.background,
  },
  stepText: {
    fontSize: 12,
    color: ONBOARDING_THEME.progress.step4Accent,
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
    backgroundColor: ONBOARDING_THEME.progress.step4Accent,
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
    backgroundColor: ONBOARDING_THEME.progress.step4Accent,
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
  },
  content: {
    flex: 1,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
  },
  questionText: {
    fontSize: 20,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    textAlign: 'center',
    marginBottom: ONBOARDING_THEME.spacing.xl,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: ONBOARDING_THEME.spacing.md,
    paddingBottom: 40,
  },
  optionButton: {
    backgroundColor: ONBOARDING_THEME.base.surface,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    padding: ONBOARDING_THEME.spacing.lg,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.text,
    fontFamily: 'GmarketSansTTFMedium',
    flex: 1,
  },
  optionScore: {
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
  
  continueButton: {
    backgroundColor: ONBOARDING_THEME.progress.step4Accent,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    paddingVertical: 16,
    marginHorizontal: ONBOARDING_THEME.spacing.lg,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'GmarketSansTTFBold',
  },
});