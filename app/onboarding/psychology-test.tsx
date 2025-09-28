// app/onboarding/psychology-test.tsx - 완전 통일된 버전 (3단계)
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
    step3: '#90CAF9', // 성격테스트 - 미디엄 블루
    step3Accent: '#1E88E5',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 }
};

// 진행바 컴포넌트
const ProgressHeader: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={progressStyles.container}>
    <Text style={progressStyles.stepText}>3단계: 성격 유형 검사</Text>
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
      <Text style={completionStyles.completionText}>성격 검사 완료!</Text>
      <Text style={completionStyles.completionSubtext}>결과를 분석했습니다</Text>
    </View>
  </View>
);

// 이모지 기반 성격 테스트 옵션
interface PersonalityOption {
  emoji: string;
  text: string;
  trait: string;
  description: string;
}

interface PersonalityQuestion {
  id: number;
  question: string;
  options: PersonalityOption[];
}

const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    id: 1,
    question: "새로운 환경에서 나는?",
    options: [
      { emoji: "🌟", text: "적극적으로 탐험한다", trait: "adventurous", description: "모험적" },
      { emoji: "🧐", text: "신중하게 관찰한다", trait: "cautious", description: "신중한" },
      { emoji: "😊", text: "사람들과 먼저 친해진다", trait: "social", description: "사교적" },
      { emoji: "🤔", text: "혼자만의 시간을 갖는다", trait: "introspective", description: "내성적" }
    ]
  },
  {
    id: 2,
    question: "스트레스를 받을 때 나는?",
    options: [
      { emoji: "💪", text: "문제를 적극적으로 해결한다", trait: "proactive", description: "적극적" },
      { emoji: "🎵", text: "음악이나 취미로 전환한다", trait: "creative", description: "창의적" },
      { emoji: "👥", text: "가족이나 친구와 대화한다", trait: "social", description: "사교적" },
      { emoji: "🧘", text: "혼자 조용히 정리한다", trait: "introspective", description: "내성적" }
    ]
  },
  {
    id: 3,
    question: "감정을 표현할 때 나는?",
    options: [
      { emoji: "💬", text: "솔직하게 말로 표현한다", trait: "direct", description: "직접적" },
      { emoji: "🎨", text: "창작이나 예술로 표현한다", trait: "creative", description: "창의적" },
      { emoji: "🤗", text: "행동으로 보여준다", trait: "expressive", description: "표현적" },
      { emoji: "📝", text: "글이나 메시지로 전달한다", trait: "thoughtful", description: "사려깊은" }
    ]
  },
  {
    id: 4,
    question: "중요한 결정을 할 때 나는?",
    options: [
      { emoji: "⚡", text: "직감을 믿고 빠르게 결정한다", trait: "intuitive", description: "직관적" },
      { emoji: "📊", text: "정보를 분석하고 계획한다", trait: "analytical", description: "분석적" },
      { emoji: "💬", text: "주변 사람들과 상의한다", trait: "collaborative", description: "협력적" },
      { emoji: "⏰", text: "충분한 시간을 두고 고민한다", trait: "thoughtful", description: "사려깊은" }
    ]
  },
  {
    id: 5,
    question: "휴식할 때 나는?",
    options: [
      { emoji: "🎉", text: "사람들과 함께 즐긴다", trait: "social", description: "사교적" },
      { emoji: "📚", text: "책이나 영화를 즐긴다", trait: "contemplative", description: "사색적" },
      { emoji: "🏃", text: "운동이나 활동적인 일을 한다", trait: "active", description: "활동적" },
      { emoji: "🌅", text: "자연이나 조용한 곳에서 힐링한다", trait: "peaceful", description: "평화로운" }
    ]
  }
];

// 성격 유형 결과
const PERSONALITY_TYPES = {
  social: {
    name: "사교적 감정가",
    emoji: "😊",
    description: "사람들과의 소통을 통해 에너지를 얻고, 감정을 나누며 성장합니다",
    traits: ["공감 능력이 뛰어남", "사회적 관계를 중시함", "감정 표현이 자연스러움"],
    tips: ["다양한 사람들과의 만남을 즐기세요", "감정 일기를 통해 내면을 더 깊이 탐구해보세요"]
  },
  creative: {
    name: "창의적 표현가",
    emoji: "🎨",
    description: "독창적인 방식으로 감정을 표현하며, 예술적 감각이 뛰어납니다",
    traits: ["독창적 사고", "예술적 감각", "감정의 다양한 표현"],
    tips: ["창작 활동을 통해 감정을 표현해보세요", "새로운 취미나 예술 분야에 도전해보세요"]
  },
  analytical: {
    name: "분석적 사고가",
    emoji: "🧐",
    description: "논리적으로 감정을 분석하고, 체계적으로 문제를 해결합니다",
    traits: ["논리적 사고", "체계적 접근", "문제 해결 능력"],
    tips: ["감정 패턴을 분석해보세요", "목표 설정과 계획을 통해 성장하세요"]
  },
  introspective: {
    name: "내성적 탐구가",
    emoji: "🤔",
    description: "깊이 있는 내면 탐구를 통해 자아를 이해하며, 조용한 성찰을 즐깁니다",
    traits: ["깊은 사고", "자기 성찰", "집중력"],
    tips: ["명상이나 요가를 통해 내면을 탐구하세요", "조용한 환경에서의 일기 쓰기를 추천합니다"]
  }
};

export default function PsychologyTest() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromProfile = (params as any)?.fromProfile === 'true';
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<PersonalityOption[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const calculateResult = (allAnswers: PersonalityOption[]) => {
    const traitCounts: Record<string, number> = {};
    
    allAnswers.forEach(answer => {
      traitCounts[answer.trait] = (traitCounts[answer.trait] || 0) + 1;
    });
    const dominantTrait = Object.keys(traitCounts).reduce((a, b) => 
      (traitCounts[a] || 0) > (traitCounts[b] || 0) ? a : b
    );

    // 주요 특성에 따라 성격 유형 매핑 
    let personalityType = 'introspective'; // 기본값
    
    if (['social', 'collaborative', 'expressive'].includes(dominantTrait)) {
      personalityType = 'social';
    } else if (['creative', 'artistic'].includes(dominantTrait)) {
      personalityType = 'creative';
    } else if (['analytical', 'thoughtful', 'cautious'].includes(dominantTrait)) {
      personalityType = 'analytical';
    } else {
      personalityType = 'introspective';
    }

    return {
      type: personalityType,
      info: PERSONALITY_TYPES[personalityType as keyof typeof PERSONALITY_TYPES],
      traitCounts,
      dominantTrait
    };
  };

  const handleAnswer = async (selectedOption: PersonalityOption) => {
    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);
    
    if (currentQuestion < PERSONALITY_QUESTIONS.length - 1) {
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
          
          const personalityData = {
            type: result.type,
            dominantTrait: result.dominantTrait,
            traitCounts: result.traitCounts,
            completedAt: new Date().toISOString(),
          };
          
          if (userDoc.exists()) {
            await updateDoc(userRef, {
              personalityType: personalityData,
              assessmentsCompleted: {
                ...userDoc.data().assessmentsCompleted,
                personality: true,
              },
            });
          } else {
            await setDoc(userRef, {
              personalityType: personalityData,
              assessmentsCompleted: { personality: true },
            }, { merge: true });
          }
          
          console.log('성격 검사 결과 저장 완료');
        }
      } catch (error) {
        console.error('성격 검사 결과 저장 실패:', error);
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
      router.replace('/calendar' as any);
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
            <View style={[styles.resultIconContainer, { backgroundColor: ONBOARDING_THEME.progress.step3 }]}>
              <Text style={styles.resultEmoji}>{testResult.info.emoji}</Text>
            </View>
            <DefaultText style={styles.resultTitle}>성격 검사 결과</DefaultText>
            <View style={[styles.resultScoreCard, { backgroundColor: ONBOARDING_THEME.progress.step3 }]}>
              <DefaultText style={[styles.resultScore, { color: ONBOARDING_THEME.progress.step3Accent }]}>
                {testResult.info.name}
              </DefaultText>
            </View>
          </View>
          
          <View style={styles.resultBody}>
            <View style={styles.messageCard}>
              <DefaultText style={styles.messageTitle}>성격 분석</DefaultText>
              <DefaultText style={styles.messageText}>{testResult.info.description}</DefaultText>
            </View>
            
            <View style={styles.recommendCard}>
              <Ionicons name="star" size={24} color="#4A90E2" />
              <DefaultText style={styles.recommendTitle}>주요 특성</DefaultText>
              {testResult.info.traits.map((trait: string, index: number) => (
                <DefaultText key={index} style={styles.recommendText}>• {trait}</DefaultText>
              ))}
            </View>
            
            <View style={styles.recommendCard}>
              <Ionicons name="bulb" size={24} color="#4A90E2" />
              <DefaultText style={styles.recommendTitle}>추천 활동</DefaultText>
              {testResult.info.tips.map((tip: string, index: number) => (
                <DefaultText key={index} style={styles.recommendText}>• {tip}</DefaultText>
              ))}
            </View>
            
            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle-outline" size={20} color="#8A94A6" />
              <DefaultText style={styles.disclaimerText}>
                이 검사는 감정 표현 성향을 파악하는 도구입니다. 개인차가 있을 수 있습니다.
              </DefaultText>
            </View>
          </View>
          
          <TouchableOpacity style={styles.continueButton} onPress={handleNext}>
            <DefaultText style={styles.continueButtonText}>
              {fromProfile ? '프로필로 돌아가기' : '캘린더로 이동 →'}
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
      <View style={[styles.header, { backgroundColor: ONBOARDING_THEME.progress.step3 }]}>
        <DefaultText style={styles.headerTitle}>성격 유형 검사</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          다양한 상황에서 나의 행동 패턴을 알아보세요
        </DefaultText>
      </View>

      {/* 진행바 */}
      <ProgressHeader current={currentQuestion + 1} total={PERSONALITY_QUESTIONS.length} />
      
      {/* 질문 영역 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <DefaultText style={styles.questionText}>
          {PERSONALITY_QUESTIONS[currentQuestion]?.question}
        </DefaultText>
        
        <View style={styles.optionsContainer}>
          {PERSONALITY_QUESTIONS[currentQuestion]?.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleAnswer(option)}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
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
    alignItems: 'center',
    gap: ONBOARDING_THEME.spacing.md,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionText: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.text,
    fontFamily: 'GmarketSansTTFMedium',
    flex: 1,
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
  resultEmoji: {
    fontSize: 36,
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
    backgroundColor: ONBOARDING_THEME.progress.step3Accent,
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