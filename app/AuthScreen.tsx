// app/AuthScreen.tsx - 새로운 플로우 적용 버전
import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import {
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import DefaultText from "../components/DefaultText";
import { Ionicons } from '@expo/vector-icons';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

export default function AuthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // Google Sign-In 설정
    GoogleSignin.configure({
      webClientId: '232207972245-eqs5voukc84bq1ehumq8kue98v58pap8.apps.googleusercontent.com',
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
    
    console.log("🔐 Google Sign-In 설정 완료");
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setShowRetry(false);
    
    try {
      console.log("🚀 Google Sign-In 시작...");
      
      // 이전 로그인 세션 확인
      await GoogleSignin.hasPlayServices();
      
      // Google Sign-In 실행
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo.data) {
        throw new Error("Google 로그인 정보를 가져올 수 없습니다.");
      }
      
      console.log("✅ Google Sign-In 성공:", userInfo.data.user.email);
      
      // Firebase 인증을 위한 Google 자격증명 생성
      const googleCredential = GoogleAuthProvider.credential(
        userInfo.data.idToken,
        userInfo.data.serverAuthCode
      );
      
      // Firebase에 로그인
      const result = await signInWithCredential(auth, googleCredential);
      
      if (result.user) {
        // 사용자 정보를 Firestore에 저장
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          spouseStatus: 'none',
        }, { merge: true });
        
        console.log("✅ Firebase 구글 로그인 성공:", result.user.email);
        
        // 🎯 새로운 플로우: 단계별 체크
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        const userData = userDoc.data();
        
        console.log("🔍 사용자 데이터 체크:", userData);
        
        if (!userData?.attachmentType) {
          console.log("🔗 애착 테스트 필요 → attachment-test로");
          router.replace("/attachment-test");
        } else if (!userData?.personalityType) {
          console.log("🧠 심리 테스트 필요 → psychology-test로");
          router.replace("/psychology-test");
        } else if (!userData?.spouseId && userData?.spouseStatus !== 'accepted') {
          console.log("💑 배우자 연결 필요 → spouse-registration으로");
          router.replace("/spouse-registration");
        } else {
          console.log("🎉 모든 단계 완료 → calendar로");
          router.replace("/calendar");
        }
      }
    } catch (error: any) {
      console.error("❌ Google Sign-In 실패:", error);
      
      let errorMessage = "Google 로그인에 실패했습니다.";
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = "Google 로그인이 취소되었습니다.";
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = "Google 로그인이 진행 중입니다. 잠시 기다려주세요.";
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = "Google Play 서비스를 사용할 수 없습니다.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = "이미 다른 방법으로 가입된 계정입니다.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const isNetworkError = 
        error.code === "auth/network-request-failed" ||
        error.code === "auth/timeout" ||
        error.message?.includes("network") ||
        error.message?.includes("timeout");
      
      if (isNetworkError) {
        setShowRetry(true);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setShowRetry(false);
    handleGoogleSignIn();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* 메인 카드 */}
          <View style={styles.mainCard}>
            {/* 헤더 */}
            <View style={styles.header}>
              {/* 로고 */}
              <Image 
                source={require('../assets/images/icon.png')} 
                style={styles.logo}
              />
              <DefaultText style={styles.screenTitle}>
                토닥토닥
              </DefaultText>
              <DefaultText style={styles.subtitle}>
                함께 쓰는 마음 일기
              </DefaultText>
            </View>

            {/* 오류 메시지 */}
            {error ? (
              <View style={styles.errorContainer}>
                <DefaultText style={styles.errorText}>{error}</DefaultText>
                {showRetry && (
                  <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                    <DefaultText style={styles.retryButtonText}>다시 시도</DefaultText>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* 구글 로그인 버튼 */}
            <TouchableOpacity
              style={[styles.googleButton, loading && styles.disabledButton]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#8D7A65" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.googleIcon} />
                  <DefaultText style={styles.googleButtonText}>Google로 시작하기</DefaultText>
                </>
              )}
            </TouchableOpacity>

            {/* 다른 방법으로 로그인 */}
            <TouchableOpacity style={styles.alternativeLogin}>
              <DefaultText style={styles.alternativeText}>
                다른 방법으로 로그인
              </DefaultText>
            </TouchableOpacity>
          </View>

          {/* 푸터 */}
          <View style={styles.footer}>
            <DefaultText style={styles.footerTitle}>AI가 도와주는 부부관계 솔루션</DefaultText>
            <DefaultText style={styles.footerSubtitle}>
              "매일의 작은 기록이{'\n'}더 나은 부부 관계를 만듭니다"
            </DefaultText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3E9", // 웜톤 베이지 배경
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 40,
    shadowColor: "#8D7A65",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
    borderRadius: 20,
  },
  screenTitle: {
    fontSize: 32,
    color: "#5D4E37",
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: "#8D7A65",
    textAlign: "center",
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: "#FFE6E6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#E74C3C",
  },
  errorText: {
    color: "#C0392B",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#E74C3C",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#C9B8A3", // 베이지톤 테두리
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
    shadowColor: "#8D7A65",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: "#5D4E37",
    fontSize: 16,
    fontWeight: "600",
  },
  alternativeLogin: {
    alignItems: "center",
    paddingVertical: 16,
  },
  alternativeText: {
    color: "#8D7A65",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  footer: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 20,
  },
  footerTitle: {
    fontSize: 18,
    color: "#5D4E37",
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    lineHeight: 24,
  },
  footerSubtitle: {
    fontSize: 14,
    color: "#8D7A65",
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
    paddingHorizontal: 10,
  },
});