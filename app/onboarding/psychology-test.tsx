// app/onboarding/psychology-test.tsx - 결과 페이지 포함 버전 (이동됨)
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import DefaultText from '../../components/DefaultText';
import { 
  STERNBERG_QUESTIONS,
  analyzeSternbergType,
  SternbergAnswers,
  SternbergLoveType
} from '../../utils/psychologyTest';

// 안전 가드 및 임시 폴백
const RAW_QUESTIONS: any = STERNBERG_QUESTIONS as any;
console.log('Imported Sternberg questions length:', Array.isArray(RAW_QUESTIONS) ? RAW_QUESTIONS.length : 'invalid');
const QUESTIONS: any[] = Array.isArray(RAW_QUESTIONS) ? RAW_QUESTIONS : [
  {
    id: 'Q1',
    question: '배우자와 대화가 즐겁습니까?',
    answers: {
      A: { text: '매우 즐겁다', score: { intimacy: 10, passion: 0, commitment: 0 } },
      B: { text: '즐겁다', score: { intimacy: 7, passion: 0, commitment: 0 } },
      C: { text: '보통이다', score: { intimacy: 4, passion: 0, commitment: 0 } },
      D: { text: '즐겁지 않다', score: { intimacy: 1, passion: 0, commitment: 0 } }
    }
  },
  {
    id: 'Q2',
    question: '배우자를 보면 설렙니까?',
    answers: {
      A: { text: '매우 설렌다', score: { intimacy: 0, passion: 10, commitment: 0 } },
      B: { text: '설렌다', score: { intimacy: 0, passion: 7, commitment: 0 } },
      C: { text: '가끔 설렌다', score: { intimacy: 0, passion: 4, commitment: 0 } },
      D: { text: '설레지 않는다', score: { intimacy: 0, passion: 1, commitment: 0 } }
    }
  },
  {
    id: 'Q3',
    question: '평생 함께하고 싶습니까?',
    answers: {
      A: { text: '확실히 그렇다', score: { intimacy: 0, passion: 0, commitment: 10 } },
      B: { text: '그렇다', score: { intimacy: 0, passion: 0, commitment: 7 } },
      C: { text: '아마도', score: { intimacy: 0, passion: 0, commitment: 4 } },
      D: { text: '모르겠다', score: { intimacy: 0, passion: 0, commitment: 1 } }
    }
  }
];

export default function PsychologyTest() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<SternbergAnswers>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [testResult, setTestResult] = useState<SternbergLoveType | null>(null);

  // 답변 선택 처리
  const handleAnswer = (answer: 'A' | 'B' | 'C' | 'D') => {
    const question = (QUESTIONS as any[])[currentQuestion];
    if (!question) return;
    
    const newAnswers = { ...answers, [question.id]: answer };
    setAnswers(newAnswers);

    // 마지막 질문이면 결과 계산
    if (currentQuestion === (QUESTIONS as any[]).length - 1) {
      calculateResult(newAnswers);
    } else {
      // 다음 질문으로
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    }
  };

  // 결과 계산 및 저장
  const calculateResult = async (finalAnswers: SternbergAnswers) => {
    setIsLoading(true);
    
    try {
      // 성향 분석
      const result = analyzeSternbergType(finalAnswers);
      setTestResult(result);

      // Firebase에 결과 저장
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          sternbergType: result.type,
          sternbergScores: {
            intimacy: result.intimacy,
            passion: result.passion,
            commitment: result.commitment,
          },
          sternbergProfile: result,
          sternbergAnswers: finalAnswers,
          sternbergCompletedAt: new Date(),
        }, { merge: true });

        console.log("✅ 심리테스트 결과 저장 완료:", result.type);
      }

      // 결과 화면 표시
      setShowResult(true);
    } catch (error) {
      console.error('심리테스트 결과 저장 실패:', error);
      Alert.alert('오류', '결과 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 다음 단계로 
  const handleContinue = () => {
    router.push('/onboarding/phq9' as any);  // PHQ-9로 이동
  };

  // 뒤로가기
  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else {
      router.back();
    }
  };

  // 로딩 화면
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#198ae6" />
            <DefaultText style={styles.loadingText}>
              당신의 성향을 분석하고 있어요...
            </DefaultText>
            <DefaultText style={styles.loadingSubText}>
              결과를 준비 중입니다 ✨
            </DefaultText>
          </View>
        </View>
      </View>
    );
  }

  // 결과 화면
  if (showResult && testResult) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.resultContainer}>
          <View style={styles.resultCard}>
            {/* 결과 헤더 */}
            <View style={styles.resultHeader}>
              <DefaultText style={styles.resultTitle}>당신의 사랑 유형</DefaultText>
              <DefaultText style={[styles.resultDescription, { marginTop: 6 }]}>
                {testResult.name}
              </DefaultText>
            </View>

            {/* 3요소 그래프 스타일 추가 */}
            
            {/* 3요소 그래프 */}
            <View style={styles.graphContainer}>
              {[
                { label: '친밀감', value: testResult.intimacy },
                { label: '열정', value: testResult.passion },
                { label: '헌신', value: testResult.commitment },
              ].map((bar, idx) => (
                <View key={idx} style={styles.bar}>
                  <DefaultText style={styles.barLabel}>{bar.label}</DefaultText>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, Math.round(bar.value)))}%` }]} />
                  </View>
                  <DefaultText style={styles.barValue}>{Math.round(bar.value)}%</DefaultText>
                </View>
              ))}
            </View>

            {/* 설명 */}
            <DefaultText style={[styles.resultDescription, { marginTop: 12 }]}>{testResult.description}</DefaultText>

            {/* 추천사항 */}
            <View style={styles.recommendationsSection}>
              <DefaultText style={styles.sectionTitle}>📝 일기 작성 팁</DefaultText>
              <View style={styles.sectionCard}>
                {(testResult.recommendations || []).map((item, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <View style={styles.bulletContainer}>
                      <DefaultText style={styles.bullet}>•</DefaultText>
                    </View>
                    <DefaultText style={styles.recommendationText}>{item}</DefaultText>
                  </View>
                ))}
              </View>
            </View>

            {/* 템플릿 제안 */}
            <View style={styles.templatesSection}>
              <DefaultText style={styles.sectionTitle}>📋 추천 템플릿</DefaultText>
              <View style={styles.templateContainer}>
                {(testResult.templates || []).map((template, index) => (
                  <View key={index} style={styles.templateChip}>
                    <DefaultText style={styles.templateText}>{template}</DefaultText>
                  </View>
                ))}
              </View>
            </View>

            {/* 계속하기 / 수정하기 */}
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={styles.startButton} onPress={handleContinue}>
                <DefaultText style={styles.startButtonText}>배우자와 연결하기</DefaultText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setShowResult(false);
                  setCurrentQuestion(Math.max(0, (STERNBERG_QUESTIONS as any[]).length - 1));
                }}
              >
                <DefaultText style={styles.secondaryButtonText}>답안 수정하기</DefaultText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // 질문 화면
  const question = (QUESTIONS as any[])[currentQuestion];
  if (!question) {
    return (
      <View style={styles.container}>
        <DefaultText>질문을 불러오는 중...</DefaultText>
      </View>
    );
  }
  
  const progress = ((currentQuestion + 1) / (QUESTIONS as any[]).length) * 100;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <DefaultText style={styles.headerTitle}>성향 분석</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          나에게 맞는 다이어리 스타일을 찾아보세요
        </DefaultText>
      </View>

      {/* 진행률 */}
      <View style={styles.progressContainer}>
        <DefaultText style={styles.progressText}>
          {currentQuestion + 1} / {(QUESTIONS as any[]).length}
        </DefaultText>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* 질문 영역 */}
      <ScrollView style={styles.questionContainer} showsVerticalScrollIndicator={false}>
        <DefaultText style={styles.questionTitle}>{question.question}</DefaultText>
        
        <View style={styles.optionsContainer}>
          {Object.entries(question.answers).map(([key, v]: any) => {
            const isSelected = answers[question.id] === (key as any);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                onPress={() => handleAnswer(key as 'A' | 'B' | 'C' | 'D')}
              >
                <View style={styles.optionContent}>
                  <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                    <DefaultText style={styles.optionLetterText}>{key}</DefaultText>
                  </View>
                  <DefaultText style={styles.optionText}>{v.text}</DefaultText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 뒤로가기 버튼 */}
        {currentQuestion > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <DefaultText style={styles.backButtonText}>← 이전 질문</DefaultText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  
  // 헤더 스타일
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111518",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#637788",
    textAlign: "center",
  },
  
  // 진행률 스타일
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  progressText: {
    fontSize: 14,
    color: "#637788",
    textAlign: "center",
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#f0f2f4",
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#198ae6",
    borderRadius: 2,
  },
  
  // 질문 영역 스타일
  questionContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111518",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 16,
    paddingBottom: 40,
  },
  optionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  optionButtonSelected: {
    borderColor: '#198ae6',
    backgroundColor: '#F0F7FF',
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#198ae6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionLetterSelected: {
    backgroundColor: '#0E73C0',
  },
  optionLetterText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  optionText: {
    color: "#111518",
    fontSize: 16,
    flex: 1,
    lineHeight: 24,
  },
  
  // 뒤로가기 버튼
  backButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  backButtonText: {
    color: "#637788",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  
  // 로딩 화면 스타일
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  loadingText: {
    color: "#111518",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  loadingSubText: {
    color: "#637788",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  
  // 결과 화면 스타일
  resultContainer: {
    padding: 24,
    paddingTop: 60,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  emojiContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f2f4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  resultEmoji: {
    fontSize: 60,
  },
  resultTitle: {
    color: "#111518",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  resultDescription: {
    color: "#111518",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  
  // 섹션 스타일
  characteristicsSection: {
    marginBottom: 24,
  },
  recommendationsSection: {
    marginBottom: 24,
  },
  templatesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: "#111518",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: "#f0f2f4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  characteristicItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bulletContainer: {
    width: 20,
    alignItems: "center",
  },
  bullet: {
    color: "#198ae6",
    fontSize: 16,
    fontWeight: "bold",
  },
  characteristicText: {
    color: "#111518",
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  recommendationText: {
    color: "#111518",
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  
  // 템플릿 스타일
  templateContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  templateChip: {
    backgroundColor: "#f0f2f4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#198ae6",
  },
  templateText: {
    color: "#198ae6",
    fontSize: 14,
    fontWeight: "600",
  },
  graphContainer: {
    marginBottom: 16,
    gap: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 56,
    fontSize: 14,
    color: '#637788',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F0F2F4',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#198ae6',
  },
  barValue: {
    width: 48,
    fontSize: 12,
    color: '#637788',
    textAlign: 'right',
  },
  
  // 시작 버튼
  startButton: {
    backgroundColor: "#198ae6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#dce1e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#637788',
    fontSize: 16,
  },
});


