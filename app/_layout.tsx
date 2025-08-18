// app/_layout.tsx - SDK 53 & React 19 완벽 호환
import 'react-native-gesture-handler';
import React, { useEffect } from "react";
import { Stack, Slot } from "expo-router";
import { Text } from "react-native";
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// GestureHandlerRootView 임포트
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 스플래시 스크린을 폰트 로딩 동안 유지
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // SDK 53 방식의 폰트 로딩
  const [fontsLoaded] = useFonts({
    'GmarketSansTTFBold': require('../assets/fonts/GmarketSansTTFBold.ttf'),
    'GmarketSansTTFLight': require('../assets/fonts/GmarketSansTTFLight.ttf'),
    'GmarketSansTTFMedium': require('../assets/fonts/GmarketSansTTFMedium.ttf'),
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // React 19 호환 방식으로 폰트 로딩 완료 시 스플래시 스크린 숨김
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // 폰트가 로드되지 않았으면 null 반환 (React 19 호환)
  if (!fontsLoaded) {
    return null;
  }

  // Text 컴포넌트 기본 폰트 설정 (SDK 53 호환)
  const TextAny = Text as any;
  TextAny.defaultProps = TextAny.defaultProps || {};
  TextAny.defaultProps.style = {
    ...(TextAny.defaultProps.style || {}),
    fontFamily: "GmarketSansTTFLight",
  };

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <Stack>
            <Stack.Screen 
              name="index" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="AuthScreen" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="attachment-test" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="psychology-test" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="onboarding-results" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="calendar" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen
              name="screens/WeeklyDiaryScreen"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="screens/WeeklyDiaryFetcher"
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="profile" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="diary/[date]" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen
              name="spouse-registration"
              options={{ headerShown: false }}
            />
            {/* WeeklyDiaryScreen은 components/screens 폴더에 있음 */}
            {/* screens 폴더의 스크린들은 별도 라우트로 처리 */}
            <Stack.Screen
              name="reports/index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="reports/[reportId]"
              options={{ headerShown: false }}
            />
          </Stack>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}