// app/index.tsx - TypeScript 에러 수정 버전
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      console.log("📱 Index.tsx - 인증 상태:", currUser ? "로그인됨" : "로그아웃됨");
      setUser(currUser);
      
      if (currUser) {
        try {
          console.log("🔍 사용자 프로필 로딩 중...");
          const userDoc = await getDoc(doc(db, 'users', currUser.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data();
            setUserProfile(profileData);
            console.log("✅ 프로필 로드 완료:", profileData);
          } else {
            console.log("❌ 사용자 문서가 존재하지 않음");
            setUserProfile(null);
          }
        } catch (error) {
          console.error('❌ 사용자 프로필 로드 실패:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // 로딩 중일 때 스플래시 화면
  if (loading || !authChecked) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <View style={styles.logoIcon}>
            <Ionicons name="heart" size={48} color="#5B9BD5" />
          </View>
          <Text style={styles.appTitle}>토닥토닥</Text>
          <Text style={styles.appSubtitle}>함께 쓰는 마음 일기</Text>
          <ActivityIndicator size="large" color="#5B9BD5" style={styles.spinner} />
          <Text style={styles.loadingText}>
            {loading ? '앱 시작 중...' : '사용자 정보 확인 중...'}
          </Text>
        </View>
      </View>
    );
  }

  // 로그인되지 않은 경우 - AuthScreen으로 이동 (타입 에러 수정)
  if (!user) {
    console.log("🔐 로그인 필요 - AuthScreen으로 이동");
    return <Redirect href={"/AuthScreen" as any} />;
  }

  // 사용자 프로필이 없거나 로딩 중인 경우
  if (!userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#5B9BD5" />
          <Text style={styles.loadingText}>사용자 정보 확인 중...</Text>
        </View>
      </View>
    );
  }

  // 온보딩 플로우 체크
  console.log("🧭 온보딩 상태 체크:", {
    attachmentType: userProfile.attachmentType,
    personalityType: userProfile?.personalityType?.type,
    spouseStatus: userProfile.spouseStatus,
    spouseId: userProfile.spouseId
  });

  // 1단계: 애착 테스트
  if (!userProfile.attachmentType) {
    console.log("📋 애착 테스트 필요 - onboarding/attachment-test로 이동");
    return <Redirect href={"/onboarding/attachment-test" as any} />;
  }

  // 2단계: PHQ-9 우울검사
  if (typeof userProfile?.phq9?.totalScore !== 'number') {
    console.log("🧪 PHQ-9 검사 필요 - onboarding/phq9로 이동");
    return <Redirect href={"/onboarding/phq9" as any} />;
  }

  // 3단계: 배우자 등록 (선택사항이지만 추천)
  const spouseStatus = userProfile.spouseStatus;
  const needsSpouseRegistration = !userProfile.spouseId && 
                                 spouseStatus !== 'accepted' && 
                                 spouseStatus !== 'declined';

  if (needsSpouseRegistration) {
    console.log("💑 배우자 등록 필요 - spouse-registration으로 이동");
    return <Redirect href={"/spouse-registration" as any} />;
  }

  // 4단계: GAD-7 불안검사 (파일 미구현 상태일 수 있음)
  if (typeof userProfile?.gad7?.totalScore !== 'number') {
    console.log("🧪 GAD-7 검사 필요 - onboarding/gad7로 이동");
    return <Redirect href={"/onboarding/gad7" as any} />;
  }

  // 5단계: 성격유형 검사
  if (!userProfile?.personalityType?.type) {
    console.log("🧠 성격유형 테스트 필요 - onboarding/psychology-test로 이동");
    return <Redirect href={"/onboarding/psychology-test" as any} />;
  }

  // 모든 온보딩 완료 - 메인 앱으로
  console.log("🎉 온보딩 완료 - 캘린더로 이동");
  return <Redirect href={"/calendar" as any} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECEF',
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
  appTitle: {
    fontSize: 32,
    color: '#1A1A1A',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: 'GmarketSansTTFBold',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#637788',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'GmarketSansTTFLight',
  },
  spinner: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#637788',
    fontSize: 14,
    fontFamily: 'GmarketSansTTFLight',
    textAlign: 'center',
  },
});