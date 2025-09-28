// app/onboarding/results.tsx - 완전 통일된 버전 (5단계)
import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
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
    step5: '#42A5F5', // 통합 결과 - 가장 진한 블루
    step5Accent: '#1565C0',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 }
};

// 완료 축하 컴포넌트
const CelebrationHeader: React.FC = () => (
  <View style={celebrationStyles.container}>
    <View style={celebrationStyles.iconContainer}>
      <Ionicons name="trophy" size={48} color="#FFD700" />
    </View>
    <DefaultText style={celebrationStyles.title}>온보딩 완료!</DefaultText>
    <DefaultText style={celebrationStyles.subtitle}>
      모든 검사를 완료했습니다. 결과를 확인해보세요!
    </DefaultText>
  </View>
);

// 검사 결과 카드 컴포넌트
type ResultCardProps = {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  result: string;
  description: string;
  onPress?: () => void;
};

const ResultCard: React.FC<ResultCardProps> = ({ title, subtitle, icon, color, result, description, onPress }) => (
  <TouchableOpacity style={[styles.resultCard, { borderColor: color + '30' }]} onPress={onPress}>
    <View style={styles.resultCardHeader}>
      <View style={[styles.resultCardIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.resultCardInfo}>
        <DefaultText style={styles.resultCardTitle}>{title}</DefaultText>
        <DefaultText style={styles.resultCardSubtitle}>{subtitle}</DefaultText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={ONBOARDING_THEME.base.textSecondary} />
    </View>
    <View style={styles.resultCardBody}>
      <DefaultText style={[styles.resultCardResult, { color }]}>{result}</DefaultText>
      <DefaultText style={styles.resultCardDescription}>{description}</DefaultText>
    </View>
  </TouchableOpacity>
);

export default function OnboardingResults() {
  const router = useRouter();
  const [userResults, setUserResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserResults();
  }, []);

  const loadUserResults = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('오류', '로그인이 필요합니다.');
        router.replace('/' as any);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        setUserResults(userDoc.data());
      } else {
        Alert.alert('오류', '사용자 데이터를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('결과 로드 실패:', error);
      Alert.alert('오류', '결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartApp = () => {
    router.replace('/calendar' as any);
  };

  const handleViewDetailResult = (type: string) => {
    // 상세 결과 보기 (필요시 구현)
    Alert.alert('상세 결과', `${type} 검사의 상세 결과를 확인할 수 있습니다.`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <DefaultText style={styles.loadingText}>결과를 불러오는 중...</DefaultText>
      </View>
    );
  }

  if (!userResults) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <DefaultText style={styles.errorText}>결과를 찾을 수 없습니다.</DefaultText>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserResults}>
          <DefaultText style={styles.retryButtonText}>다시 시도</DefaultText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 축하 헤더 */}
      <CelebrationHeader />
      
      {/* 검사 결과들 */}
      <View style={styles.resultsSection}>
        <DefaultText style={styles.sectionTitle}>📋 검사 결과</DefaultText>
        
        {/* 애착유형 결과 */}
        {userResults.attachmentType && (
          <ResultCard
            title="애착유형 검사"
            subtitle="연애 관계 패턴"
            icon="heart"
            color="#2196F3"
            result={userResults.attachmentType.type === 'secure' ? '안정형' :
                   userResults.attachmentType.type === 'anxious' ? '불안형' :
                   userResults.attachmentType.type === 'avoidant' ? '회피형' : '혼란형'}
            description={`${userResults.attachmentType.confidence}% 신뢰도`}
            onPress={() => handleViewDetailResult('애착유형')}
          />
        )}

        {/* PHQ-9 결과 */}
        {userResults.phq9 && (
          <ResultCard
            title="우울증 검사 (PHQ-9)"
            subtitle="기분 상태 평가"
            icon="medical"
            color="#1565C0"
            result={`${userResults.phq9.totalScore}점 (${userResults.phq9.interpretation})`}
            description="지난 2주간 우울 증상 평가"
            onPress={() => handleViewDetailResult('PHQ-9')}
          />
        )}

        {/* 성격유형 결과 */}
        {userResults.personalityType && (
          <ResultCard
            title="성격 유형 검사"
            subtitle="감정 표현 스타일"
            icon="person"
            color="#1E88E5"
            result={userResults.personalityType.type === 'social' ? '사교적 감정가' :
                   userResults.personalityType.type === 'creative' ? '창의적 표현가' :
                   userResults.personalityType.type === 'analytical' ? '분석적 사고가' : '내성적 탐구가'}
            description="주요 성격 특성 분석"
            onPress={() => handleViewDetailResult('성격유형')}
          />
        )}

        {/* GAD-7 결과 */}
        {userResults.gad7 && (
          <ResultCard
            title="불안장애 검사 (GAD-7)"
            subtitle="불안 수준 평가"
            icon="alert-circle"
            color="#1976D2"
            result={`${userResults.gad7.totalScore}점 (${userResults.gad7.severity})`}
            description="지난 2주간 불안 증상 평가"
            onPress={() => handleViewDetailResult('GAD-7')}
          />
        )}
      </View>

      {/* 다음 단계 안내 */}
      <NextStepsGuide />

      {/* 시작하기 버튼 */}
      <View style={styles.startButtonContainer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStartApp}>
          <DefaultText style={styles.startButtonText}>토닥토닥 시작하기</DefaultText>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// 스타일
const celebrationStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    paddingTop: 60,
    paddingBottom: ONBOARDING_THEME.spacing.xl,
    backgroundColor: ONBOARDING_THEME.progress.step5,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontFamily: 'GmarketSansTTFBold',
    color: '#FFFFFF',
    marginBottom: ONBOARDING_THEME.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontFamily: 'GmarketSansTTFMedium',
    lineHeight: 24,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ONBOARDING_THEME.base.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  retryButton: {
    backgroundColor: ONBOARDING_THEME.progress.step5Accent,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    paddingVertical: ONBOARDING_THEME.spacing.md,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'GmarketSansTTFBold',
  },
  
  resultsSection: {
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    paddingBottom: ONBOARDING_THEME.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  
  resultCard: {
    backgroundColor: ONBOARDING_THEME.base.surface,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    padding: ONBOARDING_THEME.spacing.lg,
    marginBottom: ONBOARDING_THEME.spacing.md,
    borderWidth: 1,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ONBOARDING_THEME.spacing.md,
  },
  resultCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ONBOARDING_THEME.spacing.md,
  },
  resultCardInfo: {
    flex: 1,
  },
  resultCardTitle: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: 2,
  },
  resultCardSubtitle: {
    fontSize: 12,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
  },
  resultCardBody: {
    paddingLeft: 56,
  },
  resultCardResult: {
    fontSize: 18,
    fontFamily: 'GmarketSansTTFBold',
    marginBottom: 4,
  },
  resultCardDescription: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
  },
  
  nextStepsContainer: {
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    paddingBottom: ONBOARDING_THEME.spacing.xl,
  },
  nextStepsTitle: {
    fontSize: 20,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: ONBOARDING_THEME.spacing.lg,
  },
  nextStepCard: {
    flexDirection: 'row',
    backgroundColor: ONBOARDING_THEME.base.surface,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    padding: ONBOARDING_THEME.spacing.lg,
    marginBottom: ONBOARDING_THEME.spacing.md,
    borderWidth: 1,
    borderColor: ONBOARDING_THEME.base.border,
  },
  nextStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ONBOARDING_THEME.spacing.md,
  },
  nextStepContent: {
    flex: 1,
  },
  nextStepTitle: {
    fontSize: 16,
    fontFamily: 'GmarketSansTTFBold',
    color: ONBOARDING_THEME.base.text,
    marginBottom: 4,
  },
  nextStepDescription: {
    fontSize: 14,
    color: ONBOARDING_THEME.base.textSecondary,
    fontFamily: 'GmarketSansTTFMedium',
    lineHeight: 20,
  },
  
  startButtonContainer: {
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    paddingBottom: 40,
  },
  startButton: {
    backgroundColor: ONBOARDING_THEME.progress.step5Accent,
    borderRadius: ONBOARDING_THEME.borderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: ONBOARDING_THEME.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: ONBOARDING_THEME.spacing.sm,
  },
  startButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'GmarketSansTTFBold',
  },
});

// 다음 단계 안내 컴포넌트
const NextStepsGuide: React.FC = () => (
  <View style={styles.nextStepsContainer}>
    <DefaultText style={styles.nextStepsTitle}>🎯 다음 단계</DefaultText>
    
    <View style={styles.nextStepCard}>
      <View style={styles.nextStepIcon}>
        <Ionicons name="calendar" size={24} color="#4A90E2" />
      </View>
      <View style={styles.nextStepContent}>
        <DefaultText style={styles.nextStepTitle}>1. 감정 다이어리 시작하기</DefaultText>
        <DefaultText style={styles.nextStepDescription}>
          매일 감정을 기록하고 패턴을 파악해보세요
        </DefaultText>
      </View>
    </View>

    <View style={styles.nextStepCard}>
      <View style={styles.nextStepIcon}>
        <Ionicons name="people" size={24} color="#FF7043" />
      </View>
      <View style={styles.nextStepContent}>
        <DefaultText style={styles.nextStepTitle}>2. 배우자와 연결하기</DefaultText>
        <DefaultText style={styles.nextStepDescription}>
          프로필에서 배우자를 초대하고 함께 KMSI 검사를 받아보세요
        </DefaultText>
      </View>
    </View>

    <View style={styles.nextStepCard}>
      <View style={styles.nextStepIcon}>
        <Ionicons name="analytics" size={24} color="#66BB6A" />
      </View>
      <View style={styles.nextStepContent}>
        <DefaultText style={styles.nextStepTitle}>3. 주간 감정 분석 확인하기</DefaultText>
        <DefaultText style={styles.nextStepDescription}>
          일주일마다 감정 패턴을 분석하고 개선점을 찾아보세요
        </DefaultText>
      </View>
    </View>
  </View>
);