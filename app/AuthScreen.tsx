// app/AuthScreen.tsx - @react-native-google-signin/google-signin 사용
import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
} from "react-native";
import {
  signInWithCredential,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import DefaultText from "../components/components/DefaultText";
import { Ionicons } from '@expo/vector-icons';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

export default function AuthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

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
          onboardingCompleted: false,
          spouseStatus: 'none',
        }, { merge: true });
        
        console.log("✅ Firebase 구글 로그인 성공:", result.user.email);
        
        // 온보딩 상태 확인
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        const userData = userDoc.data();
        
        if (userData?.onboardingCompleted) {
          router.replace("/calendar");
        } else {
          router.replace("/attachment-test");
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
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    if (isSignUp && !name) {
      setError("이름을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      let userCredential;
      
      if (isSignUp) {
        // 회원가입
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 사용자 정보를 Firestore에 저장
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: name,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          onboardingCompleted: false,
          spouseStatus: 'none',
        });
        
        console.log("✅ 이메일 회원가입 성공:", userCredential.user.email);
        router.replace("/attachment-test");
      } else {
        // 로그인
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("✅ 이메일 로그인 성공:", userCredential.user.email);
        
        // 온보딩 상태 확인
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        const userData = userDoc.data();
        
        if (userData?.onboardingCompleted) {
          router.replace("/calendar");
        } else {
          router.replace("/attachment-test");
        }
      }
    } catch (error: any) {
      console.error("❌ 이메일 인증 실패:", error);
      
      let errorMessage = "인증에 실패했습니다.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "등록되지 않은 이메일입니다.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "비밀번호가 올바르지 않습니다.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "유효하지 않은 이메일 형식입니다.";
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "이미 사용 중인 이메일입니다.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "비밀번호는 6자 이상이어야 합니다.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 로고 섹션 */}
        <View style={styles.logoSection}>
          <DefaultText style={styles.appTitle}>토닥토닥</DefaultText>
          <DefaultText style={styles.appSubtitle}>함께 쓰는 마음 일기</DefaultText>
        </View>

        {/* 입력 필드 섹션 */}
        <View style={styles.inputSection}>
          {/* 이름 입력 (회원가입 시에만) */}
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#8D7A65" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="이름"
                placeholderTextColor="#C9B8A3"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* 이메일 입력 */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#8D7A65" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="이메일"
              placeholderTextColor="#C9B8A3"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* 비밀번호 입력 */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#8D7A65" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor="#C9B8A3"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* 이메일 로그인/회원가입 버튼 */}
          <TouchableOpacity
            style={[styles.emailButton, loading && styles.disabledButton]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <DefaultText style={styles.emailButtonText}>
                {isSignUp ? "회원가입" : "이메일로 로그인"}
              </DefaultText>
            )}
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <DefaultText style={styles.dividerText}>또는</DefaultText>
            <View style={styles.dividerLine} />
          </View>

          {/* Google 로그인 버튼 */}
          <TouchableOpacity
            style={[styles.googleButton, loading && styles.disabledButton]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <DefaultText style={styles.googleButtonText}>Google로 시작하기</DefaultText>
          </TouchableOpacity>

          {/* 로그인/회원가입 전환 */}
          <View style={styles.switchSection}>
            <DefaultText style={styles.switchText}>
              {isSignUp ? "이미 계정이 있으신가요? " : "계정이 없으신가요? "}
            </DefaultText>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <DefaultText style={styles.switchLink}>
                {isSignUp ? "로그인" : "회원가입"}
              </DefaultText>
            </TouchableOpacity>
          </View>
        </View>

        {/* 에러 메시지 */}
        {error && (
          <View style={styles.errorContainer}>
            <DefaultText style={styles.errorText}>{error}</DefaultText>
          </View>
        )}

        {/* 푸터 */}
        <View style={styles.footer}>
          <DefaultText style={styles.footerText}>
            "매일의 작은 기록이 더 나은 우리를 만듭니다"
          </DefaultText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3E9",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 60,
  },
  appTitle: {
    fontSize: 32,
    color: "#5D4E37",
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  appSubtitle: {
    fontSize: 16,
    color: "#8D7A65",
    textAlign: "center",
  },
  inputSection: {
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    shadowColor: "#8D7A65",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#5D4E37",
    backgroundColor: "transparent",
  },
  emailButton: {
    backgroundColor: "#C9B8A3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
    shadowColor: "#8D7A65",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emailButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8D5B7",
  },
  dividerText: {
    color: "#8D7A65",
    fontSize: 14,
    marginHorizontal: 16,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    marginBottom: 32,
    shadowColor: "#8D7A65",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    color: "#5D4E37",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  switchSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  switchText: {
    color: "#8D7A65",
    fontSize: 14,
  },
  switchLink: {
    color: "#5D4E37",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  errorContainer: {
    marginTop: 16,
    marginHorizontal: 20,
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "#FFE6E6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFB3B3",
  },
  footer: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#8D7A65",
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
});