// app/assessment/gad7.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import DefaultText from '../../components/DefaultText';

const { width } = Dimensions.get('window');

// GAD-7 공식 문항 (Spitzer et al., 2006)
const GAD7_QUESTIONS = [
  "초조하거나 불안하거나 조마조마하게 느낀다",
  "걱정하는 것을 멈추거나 조절할 수가 없다",
  "여러 가지 것들에 대해 걱정을 너무 많이 한다",
  "편하게 있기가 어렵다",
  "너무 안절부절못해서 가만히 있기가 힘들다",
  "쉽게 짜증이 나거나 쉽게 성을 낸다",
  "마치 끔찍한 일이 생길 것처럼 두렵게 느껴진다"
];

// 응답 옵션 (0-3점)
const RESPONSE_OPTIONS = [
  { label: "전혀 없음", value: 0 },
  { label: "며칠 동안", value: 1 },
  { label: "일주일 이상", value: 2 },
  { label: "거의 매일", value: 3 }
];

export default function GAD7Assessment() {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(new Array(7).fill(-1));
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);

    // 자동으로 다음 문항
    if (currentQuestion < 6) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    }
  };

  const calculateResult = () => {
    const totalScore = answers.reduce((sum, val) => sum + val, 0);
    
    // 공식 해석 기준
    let interpretation = "";
    let severity = "";
    let recommendation = "";
    
    if (totalScore >= 15) {
      severity = "심한 불안";
      interpretation = "심각한 수준의 불안 증상을 경험하고 있습니다.";
      recommendation = "전문가 상담을 강력히 권장합니다. 정신건강 전문가의 도움을 받으시기 바랍니다.";
    } else if (totalScore >= 10) {
      severity = "중간 불안";
      interpretation = "중등도의 불안 증상이 있습니다.";
      recommendation = "전문가 상담을 고려해보시기 바랍니다. 스트레스 관리와 이완 기법이 도움이 될 수 있습니다.";
    } else if (totalScore >= 5) {
      severity = "가벼운 불안";
      interpretation = "경미한 불안 증상이 있습니다.";
      recommendation = "일상적인 스트레스 관리 방법을 시도해보세요. 증상이 지속되면 전문가와 상담하세요.";
    } else {
      severity = "정상";
      interpretation = "불안 증상이 거의 없거나 정상 범위입니다.";
      recommendation = "현재 불안 수준은 양호합니다. 건강한 생활습관을 유지하세요.";
    }

    return { totalScore, severity, interpretation, recommendation };
  };

  const handleSubmit = async () => {
    // 모든 문항 응답 확인
    if (answers.includes(-1)) {
      Alert.alert("알림", "모든 문항에 답해주세요.");
      return;
    }

    const result = calculateResult();
    
    try {
      // Firestore에 저장
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          gad7Score: result.totalScore,
          gad7Severity: result.severity,
          gad7Interpretation: result.interpretation,
          gad7CompletedAt: new Date().toISOString(),
          assessmentsCompleted: {
            gad7: true
          }
        }, { merge: true });
      }

      // 결과 표시
      Alert.alert(
        `GAD-7 검사 결과: ${result.totalScore}점`,
        `${result.severity}\n\n${result.interpretation}\n\n${result.recommendation}`,
        [
          {
            text: "확인",
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('결과 저장 실패:', error);
      Alert.alert("오류", "결과 저장에 실패했습니다.");
    }
  };

  const progress = ((currentQuestion + 1) / 7) * 100;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <DefaultText style={styles.headerTitle}>불안 선별검사 (GAD-7)</DefaultText>
        <View style={{ width: 24 }} />
      </View>

      {/* 진행 바 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <DefaultText style={styles.progressText}>
          {currentQuestion + 1} / 7
        </DefaultText>
      </View>

      {/* 안내 문구 - 중요! */}
      <View style={styles.instructionCard}>
        <DefaultText style={styles.instructionTitle}>
          지난 2주 동안 다음과 같은 문제들로 얼마나 자주 방해받았습니까?
        </DefaultText>
      </View>

      {/* 현재 문항 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                answers[currentQuestion] === option.value && styles.selectedOption
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
                  <DefaultText style={styles.optionScore}>
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
              <Ionicons name="arrow-back" size={20} color="#666" />
              <DefaultText style={styles.navText}>이전</DefaultText>
            </TouchableOpacity>
          )}
          
          {currentQuestion < 6 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={answers[currentQuestion] === -1}
            >
              <DefaultText style={styles.navText}>다음</DefaultText>
              <Ionicons name="arrow-forward" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, answers.includes(-1) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={answers.includes(-1)}
            >
              <DefaultText style={styles.submitText}>검사 완료</DefaultText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 출처 명시 - 필수! */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  instructionCard: {
    backgroundColor: '#FFF9E6',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
  },
  instructionTitle: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  questionNumber: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
  },
  selectedOption: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
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
    borderColor: '#E0E0E0',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedText: {
    color: '#4A90E2',
  },
  optionScore: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  nextButton: {
    marginLeft: 'auto',
  },
  navText: {
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    lineHeight: 14,
  },
});