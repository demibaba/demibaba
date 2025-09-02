// app/onboarding-results.tsx - 애착유형 + 심리검사 통합 결과페이지
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import DefaultText from '../components/DefaultText';

// 타입 정의
interface AttachmentResult {
  name: string;
  description: string;
  color: string;
  percentage: string;
  strengths: string[];
  tips: string[];
}

interface PersonalityResult {
  type: string;
  title: string;
  emoji: string;
  description: string;
  characteristics: string[];
  recommendations: string[];
  templates: string[];
}

interface UserData {
  attachmentType?: string;
  attachmentInfo?: AttachmentResult;
  personalityType?: string;
  personalityResult?: PersonalityResult;
}

export default function OnboardingResults() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserResults();
  }, []);

  const loadUserResults = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const data = userDoc.data() as UserData;
        setUserData(data);
      }
    } catch (error) {
      console.error('사용자 결과 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToMain = () => {
    router.replace('/calendar');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#198ae6" />
            <DefaultText style={styles.loadingText}>
              결과를 불러오고 있어요...
            </DefaultText>
          </View>
        </View>
      </View>
    );
  }

  if (!userData?.attachmentInfo || !userData?.personalityResult) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <DefaultText style={styles.errorText}>
            결과를 불러올 수 없어요
          </DefaultText>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserResults}>
            <DefaultText style={styles.retryButtonText}>다시 시도</DefaultText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { attachmentInfo, personalityResult } = userData;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      {/* 헤더 */}
      <View style={styles.header}>
        <DefaultText style={styles.headerTitle}>온보딩 완료! 🎉</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          당신만의 특별한 결과를 확인해보세요
        </DefaultText>
      </View>

      {/* 애착유형 결과 카드 */}
      <View style={styles.resultCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <DefaultText style={styles.cardIconText}>💕</DefaultText>
          </View>
          <DefaultText style={styles.cardTitle}>당신의 애착유형</DefaultText>
        </View>

        <View style={styles.attachmentResult}>
          <View style={[styles.typeBadge, { backgroundColor: attachmentInfo.color + '20' }]}>
            <View style={[styles.typeDot, { backgroundColor: attachmentInfo.color }]} />
            <DefaultText style={[styles.typeName, { color: attachmentInfo.color }]}>
              {attachmentInfo.name}
            </DefaultText>
          </View>
          <DefaultText style={styles.typeDescription}>
            {attachmentInfo.description}
          </DefaultText>
          <DefaultText style={styles.typePercentage}>
            {attachmentInfo.percentage}가 이 유형입니다
          </DefaultText>
        </View>

        <View style={styles.sectionContainer}>
          <DefaultText style={styles.sectionTitle}>💪 연애 강점</DefaultText>
          <View style={styles.sectionCard}>
            {attachmentInfo.strengths.map((strength, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.bulletContainer}>
                  <DefaultText style={[styles.bullet, { color: attachmentInfo.color }]}>✓</DefaultText>
                </View>
                <DefaultText style={styles.listText}>{strength}</DefaultText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <DefaultText style={styles.sectionTitle}>💡 관계 개선 팁</DefaultText>
          <View style={styles.sectionCard}>
            {attachmentInfo.tips.map((tip, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.bulletContainer}>
                  <DefaultText style={[styles.bullet, { color: attachmentInfo.color }]}>💡</DefaultText>
                </View>
                <DefaultText style={styles.listText}>{tip}</DefaultText>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 심리검사 결과 카드 */}
      <View style={styles.resultCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <DefaultText style={styles.cardIconText}>{personalityResult.emoji}</DefaultText>
          </View>
          <DefaultText style={styles.cardTitle}>당신의 성향</DefaultText>
        </View>

        <View style={styles.personalityResult}>
          <DefaultText style={styles.personalityTitle}>{personalityResult.title}</DefaultText>
          <DefaultText style={styles.personalityDescription}>
            {personalityResult.description}
          </DefaultText>
        </View>

        <View style={styles.sectionContainer}>
          <DefaultText style={styles.sectionTitle}>✨ 주요 특징</DefaultText>
          <View style={styles.sectionCard}>
            {personalityResult.characteristics.map((characteristic, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.bulletContainer}>
                  <DefaultText style={styles.bullet}>•</DefaultText>
                </View>
                <DefaultText style={styles.listText}>{characteristic}</DefaultText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <DefaultText style={styles.sectionTitle}>🌟 추천 활동</DefaultText>
          <View style={styles.sectionCard}>
            {personalityResult.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.bulletContainer}>
                  <DefaultText style={styles.bullet}>•</DefaultText>
                </View>
                <DefaultText style={styles.listText}>{recommendation}</DefaultText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <DefaultText style={styles.sectionTitle}>📝 추천 템플릿</DefaultText>
          <View style={styles.templateContainer}>
            {personalityResult.templates.map((template, index) => (
              <View key={index} style={styles.templateChip}>
                <DefaultText style={styles.templateText}>{template}</DefaultText>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 액션 버튼 */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={goToMain}>
          <DefaultText style={styles.primaryButtonText}>🚀 다이어리 시작하기</DefaultText>
        </TouchableOpacity>
      </View>

      {/* 하단 메시지 */}
      <View style={styles.footerMessage}>
        <DefaultText style={styles.footerText}>
          이 모든 결과는 언제든지 내 프로필에서 다시 확인할 수 있어요 💝
        </DefaultText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContainer: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  
  // 헤더 스타일
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111518",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#637788",
    textAlign: "center",
  },
  
  // 로딩 스타일
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
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  
  // 에러 스타일
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#198ae6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // 결과 카드 스타일
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f2f4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardIconText: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111518",
  },
  
  // 애착유형 스타일
  attachmentResult: {
    alignItems: "center",
    marginBottom: 24,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 18,
    fontWeight: "bold",
  },
  typeDescription: {
    fontSize: 16,
    color: "#111518",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  typePercentage: {
    fontSize: 14,
    color: "#637788",
    textAlign: "center",
  },
  
  // 심리검사 스타일
  personalityResult: {
    alignItems: "center",
    marginBottom: 24,
  },
  personalityTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111518",
    marginBottom: 12,
    textAlign: "center",
  },
  personalityDescription: {
    fontSize: 16,
    color: "#111518",
    textAlign: "center",
    lineHeight: 24,
  },
  
  // 섹션 스타일
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111518",
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: "#f0f2f4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletContainer: {
    width: 20,
    alignItems: "center",
  },
  bullet: {
    color: "#198ae6",
    fontSize: 14,
    fontWeight: "bold",
  },
  listText: {
    color: "#111518",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  
  // 템플릿 스타일
  templateContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  templateChip: {
    backgroundColor: "#f0f2f4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#198ae6",
  },
  templateText: {
    color: "#198ae6",
    fontSize: 12,
    fontWeight: "600",
  },
  
  // 액션 버튼 스타일
  actionContainer: {
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: "#198ae6",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  
  // 하단 메시지
  footerMessage: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#dce1e5",
    alignItems: "center",
  },
  footerText: {
    color: "#637788",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});