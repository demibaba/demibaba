// app/onboarding/gad7.tsx - 통일된 디자인 시스템 적용 (3단계)
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
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
    step3: '#90CAF9', // GAD-7 - 미디엄 블루
    step3Accent: '#1976D2', // GAD-7 강조색
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 }
};

// 진행바 컴포넌트
const ProgressHeader: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={progressStyles.container}>
    <Text style={progressStyles.stepText}>3단계: 불안장애 검사 (GAD-7)</Text>
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
            { backgroundColor: i < current ? ONBOARDING_THEME.progress.step3Accent : ONBOARDING_THEME.base.border }
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

// GAD-7 공식 문항 (기존과 동일)
const GAD7_QUESTIONS = [
  "초조하거나 불안하거나 조마조마하게 느낀다",
  "걱정하는 것을 멈추거나 조절할 수가 없다",
  "여러 가지 것들에 대해 걱정을 너무 많이 한다",
  "편하게 있기가 어렵다",
  "너무 안절부절못해서 가만히 있기가 힘들다",
  "쉽게 짜증이 나거나 쉽게 성을 낸다",
  "마치 끔찍한 일이 생길 것처럼 두렵게 느껴진다"
];

// 응답 옵션 (기존과 동일)
const RESPONSE_OPTIONS = [
  { label: "전혀 없음", value: 0, color: '#E8F5E9' },
  { label: "며칠 동안", value: 1, color: '#FFF3E0' },
  { label: "일주일 이상", value: 2, color: '#FFE0B2' },
  { label: "거의 매일", value: 3, color: '#FFCCBC' }
];

export default function GAD7Assessment() {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(new Array(7).fill(-1));
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);

    // 자동으로 다음 문항으로 (약간의 딜레이)
    if (currentQuestion < 6) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    }
  };

  const calculateResult = () => {
    const totalScore = answers.reduce((sum, val) => sum + val, 0);
    
    let interpretation = "";
    let severity = "";
    let recommendation = "";
    let color = "";
    let bgColor = "";
    let icon = "";
    
    if (totalScore >= 15) {
      severity = "심한 불안";
      color = "#EF5350";
      bgColor = "#FFEBEE";
      interpretation = "심각한 수준의 불안 증상을 경험하고 있습니다.";
      recommendation = "전문가 상담을 강력히 권장합니다. 정신건강 전문가의 도움을 받으시기 바랍니다.";
      icon = "alert-circle";
    } else if (totalScore >= 10) {
      severity = "중간 불안";
      color = "#FF7043";
      bgColor = "#FBE9E7";
      interpretation = "중등도의 불안 증상이 있습니다.";
      recommendation = "전문가 상담을 고려해보시기 바랍니다. 스트레스 관리와 이완 기법이 도움이 될 수 있습니다.";
      icon = "warning";
    } else if (totalScore >= 5) {
      severity = "가벼운 불안";
      color = "#FFA726";
      bgColor = "#FFF3E0";
      interpretation = "경미한 불안 증상이 있습니다.";
      recommendation = "일상적인 스트레스 관리 방법을 시도해보세요. 증상이 지속되면 전문가와 상담하세요.";
      icon = "information-circle";
    } else {
      severity = "정상";
      color = "#4CAF50";
      bgColor = "#E8F5E9";
      interpretation = "불안 증상이 거의 없거나 정상 범위입니다.";
      recommendation = "현재 불안 수준은 양호합니다. 건강한 생활습관을 유지하세요.";
      icon = "checkmark-circle";
    }

    return { totalScore, severity, interpretation, recommendation, color, bgColor, icon };
  };

  const handleSubmit = async () => {
    // 모든 문항 응답 확인
    if (answers.includes(-1)) {
      Alert.alert("알림", "모든 문항에 답해주세요.");
      return;
    }

    const result = calculateResult();
    setTestResult(result);
    setShowCompletionFeedback(true);
    
    try {
      // Firestore에 저장
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        const gad7Data = {
          totalScore: result.totalScore,
          severity: result.severity,
          interpretation: result.interpretation,
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
  };

  const handleNext = () => {
    router.push('/onboarding/results' as any);
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
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
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
                {testResult.severity}
              </DefaultText>
            </View>
          </View>
          
          <View style={styles.resultBody}>
            <View style={styles.messageCard}>
              <DefaultText style={styles.messageTitle}>상태 분석</DefaultText>
              <DefaultText style={styles.messageText}>{testResult.interpretation}</DefaultText>
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
          
          <View style={styles.resultFooter}>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <DefaultText style={styles.nextButtonText}>온보딩 완료 →</DefaultText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // 테스트 진행 화면
  const progress = ((currentQuestion + 1) / 7) * 100;

  return (
    <View style={styles.container}>
      {/* 통일된 헤더 */}
      <View style={[styles.header, { backgroundColor: ONBOARDING_THEME.progress.step3 }]}>
        <DefaultText style={styles.headerTitle}>불안 상태 체크</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          지난 2주 동안 다음과 같은 문제들로 얼마나 자주 방해받았습니까?
        </DefaultText>
      </View>

      {/* 진행바 */}
      <ProgressHeader current={currentQuestion + 1} total={GAD7_QUESTIONS.length} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 현재 문항 */}
        <View style={styles.questionCard}>
          <DefaultText style={styles.questionNumber}>
            문항 {currentQuestion + 1}
          </DefaultText>
          <DefaultText style={styles.questionText}>
            {GAD7_QUESTIONS[currentQuestion]}
          </DefaultText>
        </View>

        {/* 응답 옵션 */}
        <View style={styles.optionsContainer}>
          {RESPONSE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                answers[currentQuestion] === option.value && {
                  backgroundColor: option.color,
                  borderColor: ONBOARDING_THEME.progress.step3Accent,
                  borderWidth: 2,
                }
              ]}
              onPress={() => handleAnswer(option.value)}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.radio,
                  answers[currentQuestion] === option.value && styles.radioSelected
                ]} />
                <View style={styles.optionTextContainer}>
                  <DefaultText style={[
                    styles.optionLabel,
                    answers[currentQuestion] === option.value && styles.selectedText
                  ]}>
                    {option.label}
                  </DefaultText>
                  <DefaultText style={[
                    styles.optionScore,
                    answers[currentQuestion] === option.value && styles.selectedScore
                  ]}>
                    ({option.value}점)
                  </DefaultText>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 네비게이션 버튼 */}
        <View style={styles.navigation}>
          {currentQuestion > 0 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentQuestion(currentQuestion - 1)}
            >
              <Ionicons name="arrow-back" size={20} color={ONBOARDING_THEME.base.textSecondary} />
              <DefaultText style={styles.navText}>이전</DefaultText>
            </TouchableOpacity>
          )}
          
          {currentQuestion < 6 ? (
            <TouchableOpacity
              style={[
                styles.navButton, 
                styles.nextButton,
                answers[currentQuestion] === -1 && styles.disabledButton
              ]}
              onPress={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={answers[currentQuestion] === -1}
            >
              <DefaultText style={styles.navText}>다음</DefaultText>
              <Ionicons name="arrow-forward" size={20} color={ONBOARDING_THEME.base.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton, 
                answers.includes(-1) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={answers.includes(-1)}
            >
              <DefaultText style={styles.submitText}>검사 완료</DefaultText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 출처 표시 */}
      <View style={styles.footer}>
        <DefaultText style={styles.footerText}>
          © Spitzer RL, Kroenke K, Williams JBW, Löwe B. (2006)
        </DefaultText>
        <DefaultText style={styles.footerText}>
          본 검사는 선별 목적으로만 사용되며, 정확한 진단은 전문가 상담이 필요합니다.
        </DefaultText>
      </View>
    </View>
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
    color: ONBOARDING_THEME.progress.step3Accent,
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
    backgroundColor: ONBOARDING_THEME.progress.step3Accent,
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
    backgroundColor: ONBOARDING_THEME.progress.step3Accent,
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
  
  content: {
    flex: 1,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
  },
  questionCard: {
    backgroundColor: ONBOARDING_THEME.base.surface,
    padding: ONBOARDING_THEME.spacing.lg,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    marginBottom: ONBOARDING_THEME.spacing.lg,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  questionNumber: {
    fontSize: 12,
    color: ONBOARDING_THEME.progress.step3Accent,
    marginBottom: ONBOARDING_THEME.spacing.sm,
    fontFamily: 'GmarketSansTTFBold',
  },
  questionText: {
    fontSize: 18,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    lineHeight: 26,
  },
  
  optionsContainer: {
    gap: ONBOARDING_THEME.spacing.md,
  },
  optionButton: {
    backgroundColor: ONBOARDING_THEME.base.background,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
    borderRadius: ONBOARDING_THEME.borderRadius.md,
    padding: ONBOARDING_THEME.spacing.md,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: ONBOARDING_THEME.base.border,
    marginRight: ONBOARDING_THEME.spacing.md,
  },
  radioSelected: {
    borderColor: ONBOARDING_THEME.progress.step3Accent,
    backgroundColor: ONBOARDING_THEME.progress.step3Accent,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.text,
    fontFamily: 'GmarketSansTTFMedium',
  },
  selectedText: {
    color: ONBOARDING_THEME.base.text,
    fontFamily: 'GmarketSansTTFBold',
  },
  optionScore: {
    fontSize: 12,
    color: ONBOARDING_THEME.base.textSecondary,
    marginTop: 2,
    fontFamily: 'GmarketSansTTFMedium',
  },
  selectedScore: {
    color: ONBOARDING_THEME.progress.step3Accent,
    fontFamily: 'GmarketSansTTFBold',
  },
  
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: ONBOARDING_THEME.spacing.xl,
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ONBOARDING_THEME.spacing.md,
    gap: ONBOARDING_THEME.spacing.sm,
  },
  nextButton: {
    marginLeft: 'auto',
  },
  navText: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
  },
  submitButton: {
    backgroundColor: ONBOARDING_THEME.progress.step3Accent,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    paddingHorizontal: ONBOARDING_THEME.spacing.xl,
    borderRadius: ONBOARDING_THEME.borderRadius.md,
    alignItems: 'center',
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
  },
  
  footer: {
    padding: ONBOARDING_THEME.spacing.md,
    backgroundColor: ONBOARDING_THEME.base.surface,
    borderTopWidth: 1,
    borderTopColor: ONBOARDING_THEME.base.border,
  },
  footerText: {
    fontSize: 10,
    color: ONBOARDING_THEME.base.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
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
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
    color: '#FFFFFF',
  },
});