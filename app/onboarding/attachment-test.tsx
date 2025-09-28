// app/onboarding/attachment-test.tsx - 통일된 디자인 시스템 적용
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import DefaultText from "../../components/DefaultText";

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
    step1Accent: '#1976D2', // 애착유형 강조색
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 }
};

// 진행바 컴포넌트
const ProgressHeader: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={progressStyles.container}>
    <Text style={progressStyles.stepText}>1단계: 애착유형 테스트</Text>
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
    
    <TouchableOpacity style={completionStyles.nextButton} onPress={onNext}>
      <Text style={completionStyles.nextButtonText}>다음 단계로 →</Text>
    </TouchableOpacity>
  </View>
);

// 타입 정의들 (기존과 동일)
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

// 테스트 문항들 (기존과 동일)
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
      { text: "필요하고 소중한 시간이다", type: "secure", score: 2 },
      { text: "가능하면 피하고 싶다", type: "anxious", score: 3 },
      { text: "가장 편안하고 좋다", type: "avoidant", score: 3 },
      { text: "외롭기도 하지만 때로는 안전하다", type: "disorganized", score: 3 }
    ]
  },
  {
    id: 6,
    question: "연인 관계에서 가장 중요하게 생각하는 것은?",
    options: [
      { text: "서로에 대한 신뢰와 이해", type: "secure", score: 3 },
      { text: "변하지 않는 사랑의 확신", type: "anxious", score: 3 },
      { text: "각자의 독립성과 자유", type: "avoidant", score: 3 },
      { text: "복잡하지만 깊은 감정적 연결", type: "disorganized", score: 3 }
    ]
  },
  {
    id: 7,
    question: "과거 연애 경험을 되돌아보면?",
    options: [
      { text: "대체로 안정적이고 만족스러웠다", type: "secure", score: 3 },
      { text: "항상 불안하고 확인하고 싶었다", type: "anxious", score: 3 },
      { text: "너무 가까워지면 부담스러웠다", type: "avoidant", score: 3 },
      { text: "복잡하고 일관성이 없었다", type: "disorganized", score: 3 }
    ]
  }
];

// 애착유형 정보 (기존과 동일)
const ATTACHMENT_TYPES: Record<"secure" | "anxious" | "avoidant" | "disorganized", AttachmentTypeInfo> = {
  secure: {
    name: "안정형",
    description: "관계에서 편안함을 느끼며 상대방을 신뢰하는 유형",
    color: "#4CAF50",
    percentage: "전체 인구의 약 60%",
    strengths: ["일관된 애정표현", "갈등 해결 능력", "정서적 안정감"],
    tips: ["상대방의 감정에 더 세심한 관심 보이기", "꾸준한 사랑의 표현하기"]
  },
  anxious: {
    name: "불안형", 
    description: "관계에서 상대방의 사랑을 확인하고 싶어하는 유형",
    color: "#FF9800",
    percentage: "전체 인구의 약 20%",
    strengths: ["깊은 감정표현", "관계에 대한 열정", "상대방에 대한 배려"],
    tips: ["불안할 때 즉시 연락하지 말고 잠시 기다리기", "개인 시간 갖기", "자기돌봄 연습하기"]
  },
  avoidant: {
    name: "회피형",
    description: "독립성을 중시하며 과도한 친밀감을 경계하는 유형", 
    color: "#2196F3",
    percentage: "전체 인구의 약 15%",
    strengths: ["독립적 사고", "객관적 판단", "개인 공간 존중"],
    tips: ["매일 작은 애정표현 연습하기", "상대방이 다가올 때 밀어내지 않기", "감정 일기 쓰기"]
  },
  disorganized: {
    name: "혼란형",
    description: "친밀감을 원하면서도 두려워하는 복합적 특성의 유형",
    color: "#9C27B0", 
    percentage: "전체 인구의 약 5%",
    strengths: ["깊은 공감능력", "감정의 풍부함", "창의적 사고"],
    tips: ["감정 패턴 인식하기", "규칙적인 소통 시간 만들기", "전문가 상담 고려하기"]
  }
};

export default function AttachmentTestScreen() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<TestOption[]>([]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);

  // 애착유형 분석 함수 (기존과 동일)
  const analyzeAttachmentTest = (answers: TestOption[]): TestResult => {
    const scores = {
      secure: 0,
      anxious: 0,
      avoidant: 0,
      disorganized: 0
    };
    
    answers.forEach((answer: TestOption) => {
      scores[answer.type] += answer.score;
    });
    
    const maxScore = Math.max(...Object.values(scores));
    const dominantType = (Object.keys(scores) as Array<keyof typeof scores>).find(
      key => scores[key] === maxScore
    ) as "secure" | "anxious" | "avoidant" | "disorganized";
    
    return {
      type: dominantType,
      info: ATTACHMENT_TYPES[dominantType],
      scores: scores,
      confidence: Math.round((maxScore / 21) * 100)
    };
  };

  const handleAnswer = async (selectedOption: TestOption) => {
    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);
    
    if (currentQuestion < ATTACHMENT_TEST_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // 테스트 완료 - 피드백 표시
      const result = analyzeAttachmentTest(newAnswers);
      setTestResult(result);
      setShowCompletionFeedback(true);
      
      // Firebase에 저장
      try {
        const user = auth.currentUser;
        if (user) {
          await updateDoc(doc(db, "users", user.uid), {
            attachmentType: result.type,
            attachmentInfo: result.info,
            attachmentTestDate: new Date().toISOString(),
            attachmentConfidence: result.confidence
          });
          console.log("애착유형 저장 완료:", result.type);
        }
      } catch (error) {
        console.error("애착유형 저장 실패:", error);
      }

      // 2초 후 결과 화면으로
      setTimeout(() => {
        setShowCompletionFeedback(false);
        setIsCompleted(true);
      }, 2000);
    }
  };

  const handleNext = () => {
    router.push("/onboarding/phq9" as any);
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
  if (isCompleted && testResult) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.resultContainer}>
          <ProgressHeader current={7} total={7} />
          
          <View style={styles.resultHeader}>
            <DefaultText style={styles.resultTitle}>당신의 애착유형</DefaultText>
            <View style={[styles.typeBadge, { backgroundColor: testResult.info.color + '20' }]}>
              <View style={[styles.typeDot, { backgroundColor: testResult.info.color }]} />
              <DefaultText style={[styles.typeName, { color: testResult.info.color }]}>
                {testResult.info.name}
              </DefaultText>
            </View>
            <DefaultText style={styles.typeDescription}>
              {testResult.info.description}
            </DefaultText>
            <DefaultText style={styles.typePercentage}>
              {testResult.info.percentage}가 이 유형입니다
            </DefaultText>
          </View>
          
          <View style={styles.strengthsSection}>
            <DefaultText style={styles.sectionTitle}>당신의 연애 강점</DefaultText>
            {testResult.info.strengths.map((strength: string, index: number) => (
              <View key={index} style={styles.strengthRow}>
                <DefaultText style={styles.strengthBullet}>✓</DefaultText>
                <DefaultText style={styles.strengthText}>{strength}</DefaultText>
              </View>
            ))}
          </View>
          
          <View style={styles.tipsSection}>
            <DefaultText style={styles.sectionTitle}>관계 개선 팁</DefaultText>
            {testResult.info.tips.map((tip: string, index: number) => (
              <View key={index} style={styles.tipRow}>
                <DefaultText style={styles.tipIcon}>💡</DefaultText>
                <DefaultText style={styles.tipText}>{tip}</DefaultText>
              </View>
            ))}
          </View>
          
          <TouchableOpacity style={styles.continueButton} onPress={handleNext}>
            <DefaultText style={styles.continueButtonText}>다음 단계로 →</DefaultText>
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
        <DefaultText style={styles.headerTitle}>연애 스타일 분석</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          당신의 애착유형을 알아보세요
        </DefaultText>
      </View>

      {/* 진행바 */}
      <ProgressHeader current={currentQuestion + 1} total={ATTACHMENT_TEST_QUESTIONS.length} />
      
      {/* 질문 영역 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <DefaultText style={styles.questionText}>
          {ATTACHMENT_TEST_QUESTIONS[currentQuestion]!.question}
        </DefaultText>
        
        <View style={styles.optionsContainer}>
          {ATTACHMENT_TEST_QUESTIONS[currentQuestion]!.options.map((option, index) => (
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

// 스타일 (통일된 디자인 시스템 적용)
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
  nextButton: {
    backgroundColor: ONBOARDING_THEME.progress.step1Accent,
    paddingHorizontal: ONBOARDING_THEME.spacing.xl,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    marginTop: ONBOARDING_THEME.spacing.xl,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'GmarketSansTTFBold',
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
    textAlign: 'center',
    lineHeight: 24,
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
  resultTitle: {
    fontSize: 24,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: 20,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 16,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  typeName: {
    fontSize: 20,
    fontFamily: 'GmarketSansTTFBold',
  },
  typeDescription: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
    fontFamily: 'GmarketSansTTFMedium',
  },
  typePercentage: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    textAlign: 'center',
    fontFamily: 'GmarketSansTTFMedium',
  },
  strengthsSection: {
    backgroundColor: ONBOARDING_THEME.base.surface,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    padding: 20,
    marginHorizontal: ONBOARDING_THEME.spacing.lg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  tipsSection: {
    backgroundColor: ONBOARDING_THEME.base.surface,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    padding: 20,
    marginHorizontal: ONBOARDING_THEME.spacing.lg,
    marginBottom: ONBOARDING_THEME.spacing.xl,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: 16,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  strengthBullet: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 8,
    marginTop: 2,
    fontFamily: 'GmarketSansTTFBold',
  },
  strengthText: {
    flex: 1,
    fontSize: 14,
    color: ONBOARDING_THEME.base.text,
    lineHeight: 20,
    fontFamily: 'GmarketSansTTFMedium',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: ONBOARDING_THEME.base.text,
    lineHeight: 20,
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