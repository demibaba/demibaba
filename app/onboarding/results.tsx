// app/onboarding/results.tsx - 애착유형 + 심리검사 + PHQ-9 통합 결과페이지 (이동됨)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import DefaultText from '../../components/DefaultText';

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
  phq9?: {  // PHQ-9 추가
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

  const goToMain = () => {
    router.replace('/spouse-registration');  // 배우자 등록으로
  };

  // PHQ-9 점수에 따른 색상 결정
  const getPhq9Color = (score: number) => {
    if (score >= 20) return '#EF5350';  // 심각 - 빨강
    if (score >= 15) return '#FF7043';  // 중등도 - 주황
    if (score >= 10) return '#FFA726';  // 경미 - 노랑
    if (score >= 5) return '#66BB6A';   // 최소 - 연녹색
    return '#4CAF50';  // 정상 - 녹색
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

  if (!userData?.attachmentInfo || !userData?.sternbergProfile ||
      !userData.attachmentInfo.strengths || !userData.attachmentInfo.tips) {
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

  const attachmentInfo = userData?.attachmentInfo || {
    name: '로딩중',
    description: '로딩중',
    color: '#198ae6',
    percentage: '0%',
    strengths: [],
    tips: []
  };

  const sternbergProfile = userData?.sternbergProfile || {
    name: '로딩중',
    intimacy: 0,
    passion: 0,
    commitment: 0,
    description: '로딩중'
  };

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
            {(attachmentInfo.strengths || []).map((strength, index) => (
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
            {(attachmentInfo.tips || []).map((tip, index) => (
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

      {/* Sternberg 결과 카드 */}
      <View style={styles.resultCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <DefaultText style={styles.cardIconText}>💙</DefaultText>
          </View>
          <DefaultText style={styles.cardTitle}>당신의 사랑 유형</DefaultText>
        </View>

        <View style={styles.personalityResult}>
          <DefaultText style={styles.personalityTitle}>{sternbergProfile?.name || '분석 결과'}</DefaultText>
          <DefaultText style={styles.personalityDescription}>
            {sternbergProfile?.description || 'Sternberg 3요소 기반 분석 결과입니다.'}
          </DefaultText>
        </View>

        {/* 3요소 그래프 */}
        <View style={styles.sectionContainer}>
          <DefaultText style={styles.sectionTitle}>📊 관계 3요소</DefaultText>
          <View style={styles.sectionCard}>
            {[
              { label: '친밀감', value: Math.round(sternbergProfile?.intimacy || 0) },
              { label: '열정', value: Math.round(sternbergProfile?.passion || 0) },
              { label: '헌신', value: Math.round(sternbergProfile?.commitment || 0) },
            ].map((bar, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <DefaultText style={{ width: 56, fontSize: 13, color: '#637788' }}>{bar.label}</DefaultText>
                <View style={{ flex: 1, height: 8, backgroundColor: '#F0F2F4', borderRadius: 6, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${bar.value}%`, backgroundColor: '#198ae6' }} />
                </View>
                <DefaultText style={{ width: 36, fontSize: 12, color: '#637788', textAlign: 'right' }}>{bar.value}%</DefaultText>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* PHQ-9 결과 카드 추가 */}
      {userData.phq9 && (
        <View style={styles.resultCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <DefaultText style={styles.cardIconText}>💚</DefaultText>
            </View>
            <DefaultText style={styles.cardTitle}>정신건강 상태</DefaultText>
          </View>
          
          <View style={styles.phq9Result}>
            <View style={styles.phq9ScoreContainer}>
              <View style={[styles.phq9ScoreBadge, { backgroundColor: getPhq9Color(userData.phq9.totalScore) + '20' }]}>
                <DefaultText style={[styles.phq9Score, { color: getPhq9Color(userData.phq9.totalScore) }]}>
                  {userData.phq9.totalScore}점
                </DefaultText>
                <DefaultText style={[styles.phq9Level, { color: getPhq9Color(userData.phq9.totalScore) }]}>
                  {userData.phq9.interpretation}
                </DefaultText>
              </View>
            </View>
            
            <DefaultText style={styles.phq9Description}>
              PHQ-9 우울증 선별 검사 결과입니다
            </DefaultText>
            
            <View style={styles.phq9MessageBox}>
              <DefaultText style={styles.phq9Message}>
                {getPhq9Message(userData.phq9.totalScore)}
              </DefaultText>
            </View>

            {/* 점수 범위 가이드 */}
            <View style={styles.phq9Guide}>
              <DefaultText style={styles.phq9GuideTitle}>점수 해석 가이드</DefaultText>
              <View style={styles.phq9GuideItem}>
                <View style={[styles.phq9GuideDot, { backgroundColor: '#4CAF50' }]} />
                <DefaultText style={styles.phq9GuideText}>0-4점: 정상</DefaultText>
              </View>
              <View style={styles.phq9GuideItem}>
                <View style={[styles.phq9GuideDot, { backgroundColor: '#66BB6A' }]} />
                <DefaultText style={styles.phq9GuideText}>5-9점: 최소</DefaultText>
              </View>
              <View style={styles.phq9GuideItem}>
                <View style={[styles.phq9GuideDot, { backgroundColor: '#FFA726' }]} />
                <DefaultText style={styles.phq9GuideText}>10-14점: 경미</DefaultText>
              </View>
              <View style={styles.phq9GuideItem}>
                <View style={[styles.phq9GuideDot, { backgroundColor: '#FF7043' }]} />
                <DefaultText style={styles.phq9GuideText}>15-19점: 중등도</DefaultText>
              </View>
              <View style={styles.phq9GuideItem}>
                <View style={[styles.phq9GuideDot, { backgroundColor: '#EF5350' }]} />
                <DefaultText style={styles.phq9GuideText}>20점 이상: 심각</DefaultText>
              </View>
            </View>

            <View style={styles.disclaimerBox}>
              <DefaultText style={styles.disclaimerText}>
                ⚠️ 이 검사는 의학적 진단이 아닌 선별 목적입니다
              </DefaultText>
            </View>
          </View>
        </View>
      )}

      {/* 액션 버튼 */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={goToMain}>
          <DefaultText style={styles.primaryButtonText}>🚀 배우자와 연결하기</DefaultText>
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
  
  // PHQ-9 결과 스타일
  phq9Result: {
    alignItems: "center",
  },
  phq9ScoreContainer: {
    marginBottom: 16,
  },
  phq9ScoreBadge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: "center",
  },
  phq9Score: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
  },
  phq9Level: {
    fontSize: 16,
    fontWeight: "600",
  },
  phq9Description: {
    fontSize: 14,
    color: "#637788",
    textAlign: "center",
    marginBottom: 16,
  },
  phq9MessageBox: {
    backgroundColor: "#f0f2f4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#dce1e5",
  },
  phq9Message: {
    fontSize: 16,
    color: "#111518",
    textAlign: "center",
    fontWeight: "600",
  },
  phq9Guide: {
    backgroundColor: "#FAFBFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  phq9GuideTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#637788",
    marginBottom: 12,
  },
  phq9GuideItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  phq9GuideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  phq9GuideText: {
    fontSize: 13,
    color: "#111518",
  },
  disclaimerBox: {
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#F57C00",
    textAlign: "center",
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


