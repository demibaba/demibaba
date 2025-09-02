// app/psychology-test.tsx - 결과 페이지 포함 버전
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import DefaultText from '../components/DefaultText';
import { 
  PSYCHOLOGY_QUESTIONS, 
  analyzePersonality, 
  isTestComplete,
  TestAnswers,
  PersonalityResult 
} from '../utils/psychologyTest';

export default function PsychologyTest() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [testResult, setTestResult] = useState<PersonalityResult | null>(null);

  // 답변 선택 처리
  const handleAnswer = (answer: 'A' | 'B' | 'C' | 'D') => {
    const question = PSYCHOLOGY_QUESTIONS[currentQuestion];
    if (!question) return;
    
    const newAnswers = { ...answers, [question.id]: answer };
    setAnswers(newAnswers);

    // 마지막 질문이면 결과 계산
    if (currentQuestion === PSYCHOLOGY_QUESTIONS.length - 1) {
      calculateResult(newAnswers);
    } else {
      // 다음 질문으로
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    }
  };

  // 결과 계산 및 저장
  const calculateResult = async (finalAnswers: TestAnswers) => {
    setIsLoading(true);
    
    try {
      // 성향 분석
      const personalityResult = analyzePersonality(finalAnswers);
      setTestResult(personalityResult);

      // Firebase에 결과 저장
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          personalityType: personalityResult.type,
          personalityResult: personalityResult,
          testCompletedAt: new Date(),
          testAnswers: finalAnswers,
        }, { merge: true });

        console.log("✅ 심리테스트 결과 저장 완료:", personalityResult.type);
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

  // 다음 단계로 (배우자 등록)
  const handleContinue = () => {
    router.replace('/spouse-registration');
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
              <View style={styles.emojiContainer}>
                <DefaultText style={styles.resultEmoji}>{testResult.emoji}</DefaultText>
              </View>
              <DefaultText style={styles.resultTitle}>{testResult.title}</DefaultText>
              <DefaultText style={styles.resultDescription}>
                {testResult.description}
              </DefaultText>
            </View>

            {/* 성격 특징 */}
            <View style={styles.characteristicsSection}>
              <DefaultText style={styles.sectionTitle}>💡 주요 특징</DefaultText>
              <View style={styles.sectionCard}>
                {testResult.characteristics.map((item, index) => (
                  <View key={index} style={styles.characteristicItem}>
                    <View style={styles.bulletContainer}>
                      <DefaultText style={styles.bullet}>•</DefaultText>
                    </View>
                    <DefaultText style={styles.characteristicText}>{item}</DefaultText>
                  </View>
                ))}
              </View>
            </View>

            {/* 추천사항 */}
            <View style={styles.recommendationsSection}>
              <DefaultText style={styles.sectionTitle}>📝 일기 작성 팁</DefaultText>
              <View style={styles.sectionCard}>
                {testResult.recommendations.map((item, index) => (
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
                {testResult.templates.map((template, index) => (
                  <View key={index} style={styles.templateChip}>
                    <DefaultText style={styles.templateText}>{template}</DefaultText>
                  </View>
                ))}
              </View>
            </View>

            {/* 계속하기 버튼 */}
            <TouchableOpacity style={styles.startButton} onPress={handleContinue}>
              <DefaultText style={styles.startButtonText}>배우자와 연결하기</DefaultText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // 질문 화면
  const question = PSYCHOLOGY_QUESTIONS[currentQuestion];
  if (!question) {
    return (
      <View style={styles.container}>
        <DefaultText>질문을 불러오는 중...</DefaultText>
      </View>
    );
  }
  
  const progress = ((currentQuestion + 1) / PSYCHOLOGY_QUESTIONS.length) * 100;

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
          {currentQuestion + 1} / {PSYCHOLOGY_QUESTIONS.length}
        </DefaultText>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* 질문 영역 */}
      <ScrollView style={styles.questionContainer} showsVerticalScrollIndicator={false}>
        <DefaultText style={styles.questionTitle}>{question.question}</DefaultText>
        
        <View style={styles.optionsContainer}>
          {Object.entries(question.options).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={styles.optionButton}
              onPress={() => handleAnswer(key as 'A' | 'B' | 'C' | 'D')}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionLetter}>
                  <DefaultText style={styles.optionLetterText}>{key}</DefaultText>
                </View>
                <DefaultText style={styles.optionText}>{value}</DefaultText>
              </View>
            </TouchableOpacity>
          ))}
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
});