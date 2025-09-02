// app/index.tsx - 온보딩 체크 수정 버전
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import DefaultText from '../components/DefaultText';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔥 Index: Auth 상태 변경:", user ? "로그인됨" : "로그아웃됨");
      setUser(user);
      
      if (user) {
        try {
          // 사용자 프로필 정보 가져오기
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile(userData);
            console.log("✅ 사용자 프로필 로드 완료:", userData);
            console.log("🧪 온보딩 완료 여부:", userData.onboardingCompleted);
            console.log("💑 배우자 상태:", userData.spouseStatus);
          }
        } catch (error) {
          console.error("❌ 사용자 프로필 로드 실패:", error);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <View style={styles.logoIcon}>
            <Ionicons name="heart" size={48} color="#198ae6" />
          </View>
          <Text style={styles.appTitle}>토닥토닥</Text>
          <Text style={styles.appSubtitle}>함께 쓰는 마음 일기</Text>
          <ActivityIndicator size="large" color="#198ae6" style={styles.spinner} />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    console.log("👤 로그인 안됨 → AuthScreen으로");
    return <Redirect href="/AuthScreen" />;
  }

  // 🎯 단계별 온보딩 체크!
  if (userProfile) {
    // 1. 애착 테스트 미완료 → 애착 테스트로
    if (!userProfile.attachmentType) {
      console.log("🔗 애착 테스트 미완료 → attachment-test로");
      return <Redirect href="/attachment-test" />;
    }
    
    // 2. 심리 테스트 미완료 → 심리 테스트로
    if (!userProfile.personalityType) {
      console.log("🧠 심리 테스트 미완료 → psychology-test로");
      return <Redirect href="/psychology-test" />;
    }
    
    // 3. 배우자 연결 안됨 → 배우자 등록으로
    if (!userProfile.spouseId && userProfile.spouseStatus !== 'accepted') {
      console.log("💑 배우자 미연결 → spouse-registration으로");
      return <Redirect href="/spouse-registration" />;
    }
    
    // 4. 모든 조건 완료 → 메인 캘린더로
    console.log("🎉 모든 조건 완료 → calendar로");
    return <Redirect href="/calendar" />;
  }

  // 프로필 로딩 중이면 로딩 화면 유지
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#198ae6" />
        <Text style={styles.loadingText}>사용자 정보 확인 중...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dce1e5',
    minWidth: 300,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f2f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 32,
    color: '#111518',
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
    fontFamily: 'GmarketSansTTFMedium',
  },
  spinner: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#637788',
    fontSize: 14,
    fontFamily: 'GmarketSansTTFLight',
  },
});