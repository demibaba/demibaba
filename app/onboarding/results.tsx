// app/onboarding/results.tsx - 통일된 디자인 시스템 적용 (4단계 최종)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import DefaultText from '../../components/DefaultText';

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
    step4: '#42A5F5', // 최종 단계 - 가장 진한 블루
    step4Accent: '#1976D2',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 }
};

// 진행바 컴포넌트 (완료 상태)
const CompletionHeader: React.FC = () => (
  <View style={progressStyles.container}>
    <Text style={progressStyles.stepText}>온보딩 완료!</Text>
    <View style={progressStyles.completionBadge}>
      <Text style={progressStyles.completionText}>✓ 모든 검사 완료</Text>
    </View>
    <View style={progressStyles.dotsContainer}>
      {Array.from({ length: 4 }, (_, i) => (
        <View
          key={i}
          style={[progressStyles.dot, progressStyles.dotCompleted]}
        />
      ))}
    </View>
  </View>
);

// 타입 정의
interface AttachmentResult {
  name: string;
  description: string;
  color: string;
  percentage: string;
  strengths: string[];
  tips: string[];
}

interface SternbergProfile {
  name?: string;
  intimacy?: number;
  passion?: number;
  commitment?: number;
  description?: string;
}

interface UserData {
  attachmentType?: string;
  attachmentInfo?: AttachmentResult;
  sternbergType?: string;
  sternbergProfile?: SternbergProfile;
  phq9?: {
    totalScore: number;
    interpretation: string;
  };
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

  const goToSpouseRegistration = () => {
    router.replace('/spouse-registration');
  };

  // PHQ-9 점수에 따른 색상 결정
  const getPhq9Color = (score: number) => {
    if (score >= 20) return '#EF5350';
    if (score >= 15) return '#FF7043';
    if (score >= 10) return '#FFA726';
    if (score >= 5) return '#66BB6A';
    return '#4CAF50';
  };

  // PHQ-9 점수에 따른 메시지
  const getPhq9Message = (score: number) => {
    if (score >= 20) return '전문가 상담을 강력히 권유드립니다';
    if (score >= 15) return '전문가 상담을 고려해보세요';
    if (score >= 10) return '스트레스 관리가 필요합니다';
    if (score >= 5) return '현재 상태를 잘 유지하세요';
    return '정신 건강이 양호합니다';
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ONBOARDING_THEME.progress.step4Accent} />
          <DefaultText style={styles.loadingText}>
            결과를 불러오고 있어요...
          </DefaultText>
        </View>
      </View>
    );
  }

  if (!userData?.attachmentInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <DefaultText style={styles.errorText}>
            결과 데이터가 불완전합니다
          </DefaultText>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserResults}>
            <DefaultText style={styles.retryButtonText}>다시 시도</DefaultText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const attachmentInfo = userData.attachmentInfo;
  const sternbergProfile = userData.sternbergProfile;

  return (
    <View style={styles.container}>
      {/* 통일된 헤더 */}
      <View style={[styles.header, { backgroundColor: ONBOARDING_THEME.progress.step4 }]}>
        <DefaultText style={styles.headerTitle}>온보딩 완료!</DefaultText>
        <DefaultText style={styles.headerSubtitle}>
          당신만의 특별한 결과를 확인해보세요
        </DefaultText>
      </View>

      {/* 완료 진행바 */}
      <CompletionHeader />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                  <DefaultText style={[styles.bullet, { color: attachmentInfo.color }]}>✓</DefaultText>
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
                  <DefaultText style={[styles.bullet, { color: attachmentInfo.color }]}>💡</DefaultText>
                  <DefaultText style={styles.listText}>{tip}</DefaultText>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Sternberg 결과 카드 */}
        {sternbergProfile && (
          <View style={styles.resultCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <DefaultText style={styles.cardIconText}>💙</DefaultText>
              </View>
              <DefaultText style={styles.cardTitle}>당신의 사랑 유형</DefaultText>
            </View>

            <View style={styles.personalityResult}>
              <DefaultText style={styles.personalityTitle}>{sternbergProfile.name}</DefaultText>
              <DefaultText style={styles.personalityDescription}>
                {sternbergProfile.description}
              </DefaultText>
            </View>

            {/* 3요소 그래프 */}
            <View style={styles.sectionContainer}>
              <DefaultText style={styles.sectionTitle}>📊 관계 3요소</DefaultText>
              <View style={styles.sectionCard}>
                {[
                  { label: '친밀감', value: Math.round(sternbergProfile.intimacy || 0) },
                  { label: '열정', value: Math.round(sternbergProfile.passion || 0) },
                  { label: '헌신', value: Math.round(sternbergProfile.commitment || 0) },
                ].map((bar, idx) => (
                  <View key={idx} style={styles.barContainer}>
                    <DefaultText style={styles.barLabel}>{bar.label}</DefaultText>
                    <View style={styles.barBackground}>
                      <View style={[styles.barFill, { width: `${bar.value}%` }]} />
                    </View>
                    <DefaultText style={styles.barValue}>{bar.value}%</DefaultText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* PHQ-9 결과 카드 */}
        {userData.phq9 && (
          <View style={styles.resultCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <DefaultText style={styles.cardIconText}>💚</DefaultText>
              </View>
              <DefaultText style={styles.cardTitle}>정신건강 상태</DefaultText>
            </View>
            
            <View style={styles.phq9Result}>
              <View style={[styles.phq9ScoreBadge, { backgroundColor: getPhq9Color(userData.phq9.totalScore) + '20' }]}>
                <DefaultText style={[styles.phq9Score, { color: getPhq9Color(userData.phq9.totalScore) }]}>
                  {userData.phq9.totalScore}점
                </DefaultText>
                <DefaultText style={[styles.phq9Level, { color: getPhq9Color(userData.phq9.totalScore) }]}>
                  {userData.phq9.interpretation}
                </DefaultText>
              </View>
              
              <DefaultText style={styles.phq9Description}>
                PHQ-9 우울증 선별 검사 결과입니다
              </DefaultText>
              
              <View style={styles.phq9MessageBox}>
                <DefaultText style={styles.phq9Message}>
                  {getPhq9Message(userData.phq9.totalScore)}
                </DefaultText>
              </View>

              <View style={styles.disclaimerBox}>
                <DefaultText style={styles.disclaimerText}>
                  ⚠️ 이 검사는 의학적 진단이 아닌 선별 목적입니다
                </DefaultText>
              </View>
            </View>
          </View>
        )}

        {/* 다음 단계 안내 카드 */}
        <View style={styles.nextStepsCard}>
          <DefaultText style={styles.nextStepsTitle}>🎯 이제 무엇을 해야 할까요?</DefaultText>
          
          <View style={styles.stepGuide}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <DefaultText style={styles.stepNumberText}>1</DefaultText>
              </View>
              <View style={styles.stepContent}>
                <DefaultText style={styles.stepTitle}>배우자와 연결하기</DefaultText>
                <DefaultText style={styles.stepDescription}>
                  토닥토닥의 핵심 기능을 경험해보세요
                </DefaultText>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <DefaultText style={styles.stepNumberText}>2</DefaultText>
              </View>
              <View style={styles.stepContent}>
                <DefaultText style={styles.stepTitle}>첫 감정 일기 작성</DefaultText>
                <DefaultText style={styles.stepDescription}>
                  캘린더에서 오늘 하루의 감정을 기록해보세요
                </DefaultText>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <DefaultText style={styles.stepNumberText}>3</DefaultText>
              </View>
              <View style={styles.stepContent}>
                <DefaultText style={styles.stepTitle}>AI 분석 받기</DefaultText>
                <DefaultText style={styles.stepDescription}>
                  500자 이상 작성하면 맞춤형 조언을 받을 수 있어요
                </DefaultText>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <DefaultText style={styles.stepNumberText}>4</DefaultText>
              </View>
              <View style={styles.stepContent}>
                <DefaultText style={styles.stepTitle}>부부 만족도 검사 (K-MSI)</DefaultText>
                <DefaultText style={styles.stepDescription}>
                  배우자 연결 후 함께할 수 있는 특별한 검사
                </DefaultText>
              </View>
            </View>
          </View>
        </View>

        {/* 액션 버튼 */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={goToSpouseRegistration}>
            <DefaultText style={styles.primaryButtonText}>배우자와 연결하기 →</DefaultText>
          </TouchableOpacity>
        </View>

        {/* 하단 메시지 */}
        <View style={styles.footerMessage}>
          <DefaultText style={styles.footerText}>
            모든 결과는 프로필에서 언제든 다시 확인할 수 있습니다
          </DefaultText>
        </View>
      </ScrollView>
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
    color: ONBOARDING_THEME.progress.step4Accent,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'GmarketSansTTFBold',
  },
  completionBadge: {
    backgroundColor: ONBOARDING_THEME.progress.step4 + '20',
    paddingHorizontal: ONBOARDING_THEME.spacing.md,
    paddingVertical: ONBOARDING_THEME.spacing.sm,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    alignSelf: 'center',
    marginBottom: ONBOARDING_THEME.spacing.md,
  },
  completionText: {
    fontSize: 14,
    color: ONBOARDING_THEME.progress.step4Accent,
    fontFamily: 'GmarketSansTTFBold',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ONBOARDING_THEME.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: ONBOARDING_THEME.progress.step4Accent,
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
  },
  
  content: {
    flex: 1,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
  },
  
  // 로딩 및 에러 스타일
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: ONBOARDING_THEME.spacing.md,
    fontSize: 16,
    color: ONBOARDING_THEME.base.text,
    fontFamily: 'GmarketSansTTFMedium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ONBOARDING_THEME.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: '#EF5350',
    textAlign: 'center',
    marginBottom: ONBOARDING_THEME.spacing.lg,
    fontFamily: 'GmarketSansTTFMedium',
  },
  retryButton: {
    backgroundColor: ONBOARDING_THEME.progress.step4Accent,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    borderRadius: ONBOARDING_THEME.borderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
  },
  
  // 결과 카드 스타일
  resultCard: {
    backgroundColor: ONBOARDING_THEME.base.surface,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    padding: ONBOARDING_THEME.spacing.lg,
    marginBottom: ONBOARDING_THEME.spacing.lg,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ONBOARDING_THEME.progress.step4 + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ONBOARDING_THEME.spacing.md,
  },
  cardIconText: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
  },
  
  // 애착유형 스타일
  attachmentResult: {
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ONBOARDING_THEME.spacing.md,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    borderRadius: ONBOARDING_THEME.borderRadius.xl,
    marginBottom: ONBOARDING_THEME.spacing.md,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: ONBOARDING_THEME.spacing.sm,
  },
  typeName: {
    fontSize: 18,
    fontFamily: 'GmarketSansTTFBold',
  },
  typeDescription: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: ONBOARDING_THEME.spacing.sm,
    fontFamily: 'GmarketSansTTFMedium',
  },
  typePercentage: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    textAlign: 'center',
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  // 심리검사 스타일
  personalityResult: {
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  personalityTitle: {
    fontSize: 20,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: ONBOARDING_THEME.spacing.sm,
    textAlign: 'center',
  },
  personalityDescription: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.text,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  // PHQ-9 결과 스타일
  phq9Result: {
    alignItems: 'center',
  },
  phq9ScoreBadge: {
    paddingVertical: ONBOARDING_THEME.spacing.md,
    paddingHorizontal: ONBOARDING_THEME.spacing.xl,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.md,
  },
  phq9Score: {
    fontSize: 28,
    fontFamily: 'GmarketSansTTFBold',
    marginBottom: 4,
  },
  phq9Level: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
  },
  phq9Description: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    textAlign: 'center',
    marginBottom: ONBOARDING_THEME.spacing.md,
    fontFamily: 'GmarketSansTTFMedium',
  },
  phq9MessageBox: {
    backgroundColor: ONBOARDING_THEME.base.background,
    borderRadius: ONBOARDING_THEME.borderRadius.md,
    padding: ONBOARDING_THEME.spacing.md,
    marginBottom: ONBOARDING_THEME.spacing.md,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  phq9Message: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.text,
    textAlign: 'center',
    fontFamily: 'GmarketSansTTFBold',
  },
  disclaimerBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: ONBOARDING_THEME.borderRadius.sm,
    padding: ONBOARDING_THEME.spacing.md,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#F57C00',
    textAlign: 'center',
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  // 섹션 스타일
  sectionContainer: {
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: ONBOARDING_THEME.spacing.md,
  },
  sectionCard: {
    backgroundColor: ONBOARDING_THEME.base.background,
    borderRadius: ONBOARDING_THEME.borderRadius.md,
    padding: ONBOARDING_THEME.spacing.md,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: ONBOARDING_THEME.spacing.sm,
  },
  bullet: {
    fontSize: 14,
    fontFamily: 'GmarketSansTTFBold',
    marginRight: ONBOARDING_THEME.spacing.sm,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: ONBOARDING_THEME.base.text,
    lineHeight: 20,
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  // 바 차트 스타일
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.sm,
  },
  barLabel: {
    width: 56,
    fontSize: 13,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: ONBOARDING_THEME.base.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: ONBOARDING_THEME.spacing.sm,
  },
  barFill: {
    height: '100%',
    backgroundColor: ONBOARDING_THEME.progress.step4Accent,
  },
  barValue: {
    width: 36,
    fontSize: 12,
    color: ONBOARDING_THEME.base.textSecondary,
    textAlign: 'right',
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  // 다음 단계 안내 카드
  nextStepsCard: {
    backgroundColor: ONBOARDING_THEME.progress.step4 + '10',
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    padding: ONBOARDING_THEME.spacing.lg,
    marginBottom: ONBOARDING_THEME.spacing.lg,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.progress.step4 + '30',
  },
  nextStepsTitle: {
    fontSize: 18,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: ONBOARDING_THEME.spacing.lg,
    textAlign: 'center',
  },
  stepGuide: {
    gap: ONBOARDING_THEME.spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ONBOARDING_THEME.progress.step4Accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ONBOARDING_THEME.spacing.md,
  },
  stepNumberText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'GmarketSansTTFBold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    lineHeight: 20,
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  // 액션 버튼
  actionContainer: {
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  primaryButton: {
    backgroundColor: ONBOARDING_THEME.progress.step4Accent,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'GmarketSansTTFBold',
  },
  
  // 하단 메시지
  footerMessage: {
    paddingTop: ONBOARDING_THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ONBOARDING_THEME.base.border,
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    textAlign: 'center',
    fontFamily: 'GmarketSansTTFMedium',
  },
});