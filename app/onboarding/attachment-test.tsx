// app/onboarding/attachment-test.tsx - 완전 통일된 버전 (1단계)
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Text,
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
    step1: '#E3F2FD', // 애착유형 - 연한 블루
    step1Accent: '#2196F3',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 }
};

// 진행바 컴포넌트
const ProgressHeader: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={progressStyles.container}>
    <Text style={progressStyles.stepText}>1단계: 애착유형 검사</Text>
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
            { backgroundColor: i < current ? ONBOARDING_THEME.progress.step1Accent : ONBOARDING_THEME.base.border }
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
      <Text style={completionStyles.completionText}>애착유형 검사 완료!</Text>
      <Text style={completionStyles.completionSubtext}>결과를 분석했습니다</Text>
    </View>
  </View>
);

// 타입 정의들
interface TestOption {
  text: string;
  type: "secure" | "anxious" | "avoidant" | "disorganized";
  score: number;
}

interface TestQuestion {
  id: number;
  question: string;
  options: TestOption[];
}

interface AttachmentTypeInfo {
  name: string;
  description: string;
  color: string;
  percentage: string;
  strengths: string[];
  tips: string[];
}

interface TestResult {
  type: "secure" | "anxious" | "avoidant" | "disorganized";
  info: AttachmentTypeInfo;
  scores: {
    secure: number;
    anxious: number;
    avoidant: number;
    disorganized: number;
  };
  confidence: number;
}

// 테스트 문항들
const ATTACHMENT_TEST_QUESTIONS: TestQuestion[] = [
  {
    id: 1,
    question: "연인과의 관계에서 어떤 경우가 더 편안하신가요?",
    options: [
      { text: "서로 적당한 거리를 유지하며 지내는 것", type: "avoidant", score: 3 },
      { text: "항상 가까이 있으며 많은 시간을 함께 하는 것", type: "anxious", score: 3 },
      { text: "상황에 따라 가깝기도 하고 떨어져 있기도 하는 것", type: "secure", score: 3 },
      { text: "예측하기 어렵고 복잡한 감정을 느끼는 것", type: "disorganized", score: 3 }
    ]
  },
  {
    id: 2,
    question: "연인이 갑자기 연락이 늦어지면 어떤 생각이 드나요?",
    options: [
      { text: "바쁘겠구나, 나중에 연락오겠지", type: "secure", score: 3 },
      { text: "혹시 나한테 관심이 없어진 건 아닐까 불안해진다", type: "anxious", score: 3 },
      { text: "별로 신경 쓰지 않는다", type: "avoidant", score: 3 },
      { text: "화가 나면서도 동시에 불안하다", type: "disorganized", score: 3 }
    ]
  },
  {
    id: 3,
    question: "연인과 갈등이 생겼을 때 주로 어떻게 하시나요?",
    options: [
      { text: "냉정하게 시간을 두고 생각한 뒤 대화한다", type: "secure", score: 3 },
      { text: "빨리 해결하고 싶어서 계속 연락하고 만나려 한다", type: "anxious", score: 3 },
      { text: "최대한 갈등 상황을 피하고 혼자 있으려 한다", type: "avoidant", score: 3 },
      { text: "감정이 복잡해서 어떻게 해야 할지 모르겠다", type: "disorganized", score: 3 }
    ]
  },
  {
    id: 4,
    question: "연인에게 자신의 속마음을 털어놓는 것에 대해 어떻게 생각하시나요?",
    options: [
      { text: "편안하고 자연스럽다", type: "secure", score: 3 },
      { text: "가끔 부담스럽지만 꼭 필요하다고 생각한다", type: "anxious", score: 2 },
      { text: "어색하고 불편하다", type: "avoidant", score: 3 },
      { text: "하고 싶으면서도 두렵다", type: "disorganized", score: 3 }
    ]
  },
  {
    id: 5,
    question: "혼자 있는 시간에 대해 어떻게 느끼시나요?",
    options: [
      { text: "편안하고 충전되는 느낌이다", type: "secure", score: 2 },
      { text: "외롭고 불안하다", type: "anxious", score: 3 },
      { text: "가장 편안하다", type: "avoidant", score: 3 },
      { text: "복잡한 감정이 든다", type: "disorganized", score: 3 }
    ]
  }
];

// 애착유형 정보
const ATTACHMENT_TYPES: Record<string, AttachmentTypeInfo> = {
  secure: {
    name: "안정형",
    description: "건강한 관계를 형성하며, 적당한 독립성과 친밀감을 유지합니다",
    color: "#4CAF50",
    percentage: "60%",
    strengths: ["효과적인 의사소통", "감정 조절 능력", "신뢰 관계 형성"],
    tips: ["현재의 건강한 관계 패턴을 유지하세요", "파트너와의 균형잡힌 소통을 계속하세요"]
  },
  anxious: {
    name: "불안형",
    description: "사랑받고 싶은 욕구가 강하며, 관계에서 불안감을 자주 느낍니다",
    color: "#FF9800",
    percentage: "20%",
    strengths: ["감정 표현이 풍부함", "관계에 대한 높은 관심", "공감 능력"],
    tips: ["자기 진정 기법을 연습해보세요", "파트너와의 소통에서 명확한 표현을 하세요"]
  },
  avoidant: {
    name: "회피형",
    description: "독립성을 중시하며, 지나친 친밀감을 불편해합니다",
    color: "#2196F3",
    percentage: "15%",
    strengths: ["높은 독립성", "논리적 사고", "스트레스 관리"],
    tips: ["파트너와의 감정적 연결을 시도해보세요", "작은 단계부터 감정 표현을 연습하세요"]
  },
  disorganized: {
    name: "혼란형",
    description: "일관되지 않는 관계 패턴을 보이며, 복잡한 감정을 경험합니다",
    color: "#9C27B0",
    percentage: "5%",
    strengths: ["다양한 관점 이해", "창의적 사고", "적응력"],
    tips: ["일관된 관계 패턴을 만들어보세요", "전문가의 도움을 받는 것을 고려해보세요"]
  }
};

export default function AttachmentTest() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromProfile = (params as any)?.fromProfile === 'true';
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<TestOption[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const calculateResult = (allAnswers: TestOption[]): TestResult => {
    const scores = {
      secure: 0,
      anxious: 0,
      avoidant: 0,
      disorganized: 0
    };

    allAnswers.forEach(answer => {
      scores[answer.type] += answer.score;
    });

    const maxScore = Math.max(...Object.values(scores));
    const resultType = Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore) as keyof typeof scores;
    
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const confidence = Math.round((maxScore / total) * 100);

    const info = ATTACHMENT_TYPES[resultType];
    return {
      type: resultType,
      info: info as AttachmentTypeInfo,
      scores,
      confidence
    };
  };

  const handleAnswer = async (selectedOption: TestOption) => {
    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);
    
    if (currentQuestion < ATTACHMENT_TEST_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    } else {
      // 테스트 완료
      const result = calculateResult(newAnswers);
      setTestResult(result);
      setShowCompletionFeedback(true);
      
      // Firebase에 저장
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          const attachmentData = {
            type: result.type,
            scores: result.scores,
            confidence: result.confidence,
            completedAt: new Date().toISOString(),
          };
          
          if (userDoc.exists()) {
            await updateDoc(userRef, {
              attachmentType: attachmentData,
              assessmentsCompleted: {
                ...userDoc.data().assessmentsCompleted,
                attachment: true,
              },
            });
          } else {
            await setDoc(userRef, {
              attachmentType: attachmentData,
              assessmentsCompleted: { attachment: true },
            }, { merge: true });
          }
          
          console.log('애착유형 결과 저장 완료');
        }
      } catch (error) {
        console.error('애착유형 결과 저장 실패:', error);
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
      router.push('/onboarding/phq9' as any);
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
          <ProgressHeader current={5} total={5} />
          
          <View style={styles.resultHeader}>
            <View style={[styles.resultIconContainer, { backgroundColor: testResult.info.color + '20' }]}>
              <Ionicons name="heart" size={48} color={testResult.info.color} />
            </View>
            <DefaultText style={styles.resultTitle}>애착유형 검사 결과</DefaultText>
            <View style={[styles.resultScoreCard, { backgroundColor: testResult.info.color + '20' }]}>
              <DefaultText style={[styles.resultScore, { color: testResult.info.color }]}>
                {testResult.info.name}
              </DefaultText>
              <DefaultText style={[styles.resultLevel, { color: testResult.info.color }]}>
                {testResult.confidence}% 신뢰도
              </DefaultText>
            </View>
          </View>
          
          <View style={styles.resultBody}>
            <View style={styles.messageCard}>
              <DefaultText style={styles.messageTitle}>특성 분석</DefaultText>
              <DefaultText style={styles.messageText}>{testResult.info.description}</DefaultText>
            </View>
            
            <View style={styles.recommendCard}>
              <Ionicons name="star" size={24} color="#4A90E2" />
              <DefaultText style={styles.recommendTitle}>강점</DefaultText>
              {testResult.info.strengths.map((strength, index) => (
                <DefaultText key={index} style={styles.recommendText}>• {strength}</DefaultText>
              ))}
            </View>
            
            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle-outline" size={20} color="#8A94A6" />
              <DefaultText style={styles.disclaimerText}>
                이 검사는 일반적인 애착 성향을 파악하는 도구입니다. 개인차가 있을 수 있습니다.
              </DefaultText>
            </View>
          </View>
          
          <TouchableOpacity style={styles.continueButton} onPress={handleNext}>
            <DefaultText style={styles.continueButtonText}>
              {fromProfile ? '프로필로 돌아가기' : '우울증 검사하기 →'}
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
      <View style={[styles.header, { backgroundColor: ONBOARDING_THEME.progress.step1 }]}>
        <DefaultText style={styles.headerTitle}>애착유형 검사</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          연인과의 관계에서 나의 행동 패턴을 알아보세요
        </DefaultText>
      </View>

      {/* 진행바 */}
      <ProgressHeader current={currentQuestion + 1} total={ATTACHMENT_TEST_QUESTIONS.length} />
      
      {/* 질문 영역 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <DefaultText style={styles.questionText}>
          {ATTACHMENT_TEST_QUESTIONS[currentQuestion]?.question ?? ''}
        </DefaultText>
        
        <View style={styles.optionsContainer}>
          {(ATTACHMENT_TEST_QUESTIONS[currentQuestion]?.options ?? []).map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleAnswer(option)}
            >
              <DefaultText style={styles.optionText}>{option.text}</DefaultText>
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
    color: ONBOARDING_THEME.progress.step1Accent,
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
    backgroundColor: ONBOARDING_THEME.progress.step1Accent,
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
    backgroundColor: ONBOARDING_THEME.progress.step1Accent,
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
  },
  optionText: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.text,
    fontFamily: 'GmarketSansTTFMedium',
    textAlign: 'center',
    lineHeight: 22,
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
    fontSize: 24,
    fontFamily: 'GmarketSansTTFBold',
    marginBottom: 4,
  },
  resultLevel: {
    fontSize: 14,
    fontFamily: 'GmarketSansTTFMedium',
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
    gap: ONBOARDING_THEME.spacing.sm,
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
    backgroundColor: ONBOARDING_THEME.progress.step1Accent,
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