import 'react-native-gesture-handler';
import React, { useEffect, useState } from "react";
import { Stack, Redirect } from "expo-router";
import { Text, View } from "react-native";
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import AuthScreen from '../components/screens/AuthScreen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'GmarketSansTTFBold': require('../assets/fonts/GmarketSansTTFBold.ttf'),
    'GmarketSansTTFLight': require('../assets/fonts/GmarketSansTTFLight.ttf'),
    'GmarketSansTTFMedium': require('../assets/fonts/GmarketSansTTFMedium.ttf'),
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSpouseRegistration, setShowSpouseRegistration] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔐 인증 상태 변경:", user ? "로그인됨" : "로그아웃됨");
      setUser(user);
      
      if (user) {
        // 사용자 프로필 정보 가져오기
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data();
            setUserProfile(profileData);
            console.log("🔍 사용자 프로필 로드됨:", profileData);
            
            // 스퍼스 등록이 필요한지 확인 (강제 이동 조건 축소)
            const status = profileData.spouseStatus;
            const needsRegistration = status === 'pending' || status === 'requested' || status === 'unregistered';
            if (needsRegistration) {
              console.log("💑 스퍼스 등록 진행 중 - spouse-registration 화면 표시");
              setShowSpouseRegistration(true);
            } else {
              console.log("💑 스퍼스 등록 불필요 또는 완료 - 메인 앱 표시");
              setShowSpouseRegistration(false);
            }
          }
        } catch (error) {
          console.error("사용자 프로필 로드 오류:", error);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!fontsLoaded || loading) {
    return null;
  }

  // 로그인되지 않은 경우 AuthScreen 표시
  if (!user) {
    console.log("🔐 로그인 화면 표시");
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <AuthScreen />
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // 스퍼스 등록이 필요한 경우 spouse-registration 화면 표시
  if (showSpouseRegistration) {
    console.log("💑 스퍼스 등록 화면 표시");
    return <Redirect href="/spouse-registration" />;
  }

  // Text 컴포넌트 기본 폰트 설정
  const TextAny = Text as any;
  TextAny.defaultProps = TextAny.defaultProps || {};
  TextAny.defaultProps.style = {
    ...(TextAny.defaultProps.style || {}),
    fontFamily: "GmarketSansTTFLight",
  };

  console.log("🏠 메인 앱 화면 표시 (사용자:", user.email, ")");

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="index" />
            <Stack.Screen name="calendar" />
            <Stack.Screen name="diary/[date]" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="reports/[reportId]" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="spouse-registration" />
            <Stack.Screen name="spouse-requests" />
            <Stack.Screen name="onboarding" />
          </Stack>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}