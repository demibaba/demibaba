// app/index.tsx - 이전 GPT 시절 UI/UX 복구 버전
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import DefaultText from '../components/components/DefaultText';
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
            setUserProfile(userDoc.data());
            console.log("✅ 사용자 프로필 로드 완료");
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
            <Ionicons name="heart" size={48} color="#C9B8A3" />
          </View>
          <Text style={styles.appTitle}>토닥토닥</Text>
          <Text style={styles.appSubtitle}>함께 쓰는 마음 일기</Text>
          <ActivityIndicator size="large" color="#C9B8A3" style={styles.spinner} />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="AuthScreen" />;
  }

  // 사용자가 로그인되어 있지만 프로필이 없으면 배우자 등록으로
  if (!userProfile?.spouseId) {
    return <Redirect href="spouse-registration" />;
  }

  // 모든 조건이 충족되면 메인 화면으로
  return <Redirect href="calendar" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F3E9',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 50,
    alignItems: 'center',
    shadowColor: "#8D7A65",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    minWidth: 300,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F7F3E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appTitle: {
    fontSize: 32,
    color: '#5D4E37',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: 'GmarketSansTTFBold',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#8D7A65',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'GmarketSansTTFMedium',
  },
  spinner: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#8D7A65',
    fontSize: 14,
    fontFamily: 'GmarketSansTTFLight',
  },
});