// components/screens/AuthScreen.tsx - 경로 수정 및 완전한 버전
import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth, db } from "../../config/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import DefaultText from "../DefaultText";
import { Ionicons } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

// TermsModal 컴포넌트 (같은 파일 내에 정의)
interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose, type }) => {
  const isTerms = type === 'terms';
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <DefaultText style={modalStyles.title}>
            {isTerms ? '서비스 이용약관' : '개인정보 처리방침'}
          </DefaultText>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={true}>
          <DefaultText style={modalStyles.contentText}>
            {isTerms ? TERMS_CONTENT : PRIVACY_CONTENT}
          </DefaultText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// 이용약관 내용
// 수정된 이용약관 내용
// 최종 수정된 이용약관 내용
const TERMS_CONTENT = `제1조 (목적)
이 약관은 박찬영(이하 "서비스 제공자")이 제공하는 부부 감정 기록 및 분석 서비스 "토닥토닥"(이하 "서비스")의 이용과 관련하여 서비스 제공자와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 서비스 제공자가 제공하는 부부 간 감정 기록, 분석, 상담 보조 서비스를 의미합니다.
2. "회원"이란 이 약관에 동의하고 서비스 제공자와 서비스 이용계약을 체결한 개인을 말합니다.
3. "부부"란 법적 혼인관계 또는 사실혼 관계에 있는 2인을 의미합니다.

제3조 (서비스 제공자 정보)
1. 서비스명: 토닥토닥
2. 운영자: 박찬영 (개인)
3. 연락처: dogadogados86@gmail.com
4. 서비스 형태: 온라인 모바일 애플리케이션

제4조 (약관의 효력 및 변경)
1. 이 약관은 서비스를 이용하고자 하는 모든 회원에게 그 효력이 발생합니다.
2. 서비스 제공자는 필요한 경우 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지를 통해 공시합니다.

제5조 (서비스의 제공)
1. 서비스 제공자는 다음과 같은 서비스를 제공합니다:
   - 개인 및 부부 감정 기록 기능
   - AI 기반 감정 분석 및 리포트
   - 부부 관계 개선을 위한 정보 제공
   - 기타 서비스 제공자가 정하는 서비스

제6조 (회원가입)
1. 회원가입은 다음 방법으로 가능합니다:
   - Google 계정을 통한 소셜 로그인
   - 이메일과 비밀번호를 통한 직접 가입
2. 만 19세 미만의 미성년자는 서비스를 이용할 수 없습니다.
3. 서비스 제공자는 다음의 경우 회원가입을 승낙하지 않을 수 있습니다:
   - 타인의 정보를 도용한 경우
   - 서비스 운영을 고의로 방해한 이력이 있는 경우

제7조 (회원탈퇴 및 자격 상실)
1. 회원은 언제든지 서비스 탈퇴를 요청할 수 있습니다.
2. 회원 탈퇴 시 모든 개인정보는 즉시 삭제되며, 복구할 수 없습니다.

제8조 (개인정보보호)
회원의 개인정보보호에 관한 사항은 별도의 개인정보 처리방침에 따릅니다.

제9조 (서비스 이용제한)
1. 회원은 다음 행위를 하여서는 안 됩니다:
   - 타인의 개인정보를 부정하게 이용하는 행위
   - 서비스의 안정적 운영을 방해하는 행위
   - 공공질서 및 미풍양속에 반하는 행위

제10조 (면책조항)
1. 본 서비스는 상담 보조 목적이며, 의료행위를 대체할 수 없습니다.
2. 서비스 제공자는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.

제11조 (준거법 및 관할법원)
이 약관에 관하여 분쟁이 생긴 경우, 대한민국 법을 준거법으로 하며, 서울중앙지방법원을 관할 법원으로 합니다.

부칙
이 약관은 2025년 1월 15일부터 시행됩니다.`;

// 최종 수정된 개인정보처리방침 내용
const PRIVACY_CONTENT = `개인정보 처리방침

박찬영(이하 "개인정보처리자")은 개인정보보호법 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

■ 개인정보처리자 정보
- 개인정보처리자: 박찬영 (개인)
- 서비스명: 토닥토닥
- 연락처: dogadogados86@gmail.com
- 서비스 형태: 온라인 서비스

제1조 (개인정보의 처리목적)
개인정보처리자는 다음의 목적을 위하여 개인정보를 처리합니다:

1. 회원 가입 및 관리
   - 회원 식별, 서비스 이용의사 확인, 연령 확인 등

2. 서비스 제공
   - 부부 감정 기록 및 분석 서비스 제공
   - AI 기반 관계 분석 리포트 제공
   - 맞춤형 콘텐츠 추천

제2조 (개인정보의 처리 및 보유기간)
1. 회원 가입 및 관리: 회원 탈퇴 시까지
2. 감정 기록 데이터: 회원 탈퇴 후 즉시 삭제
3. 서비스 이용 기록: 3개월 (통계 목적)

제3조 (처리하는 개인정보 항목)
개인정보처리자는 회원가입 방법에 따라 다음의 개인정보를 수집합니다:

1. Google 로그인 시 수집 항목
   - Google 계정 정보 (이메일, 이름, 프로필 사진)

2. 이메일 가입 시 수집 항목
   - 이메일 주소, 사용자명, 암호화된 비밀번호

3. 서비스 이용 중 수집 항목 (공통)
   - 서비스 이용 기록
   - 감정 기록 데이터
   - 부부 연결 정보

4. 선택항목
   - 애착 유형 검사 결과
   - 심리 검사 결과

제4조 (개인정보의 제3자 제공)
개인정보처리자는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다.

다만, 다음의 경우에는 예외로 합니다:
1. Claude API (Anthropic Inc.): AI 분석 서비스 제공 목적
   - 제공항목: 감정 기록 데이터 (개인 식별 정보 제외)
   - 보유기간: 분석 완료 후 즉시 삭제

제5조 (개인정보처리 위탁)
개인정보처리자는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:

1. Google Firebase (Google LLC)
   - 위탁업무: 사용자 인증, 데이터 저장
   - 위탁기간: 서비스 제공 기간

제6조 (정보주체의 권리·의무 및 행사방법)
정보주체는 개인정보처리자에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:

1. 개인정보 처리현황 통지 요구
2. 개인정보 열람 요구
3. 개인정보 정정·삭제 요구
4. 개인정보 처리정지 요구

권리 행사는 이메일(dogadogados86@gmail.com)을 통해 할 수 있습니다.

제7조 (개인정보의 파기)
개인정보처리자는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.

제8조 (개인정보의 안전성 확보조치)
개인정보처리자는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:

1. 관리적 조치: 개인정보 취급직원의 최소화 및 교육
2. 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 암호화
3. 물리적 조치: 접근통제

제9조 (개인정보보호책임자)
- 개인정보보호책임자: 박찬영
- 연락처: dogadogados86@gmail.com

제10조 (개인정보 처리방침 변경)
이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.

시행일자: 2025년 1월 15일`;

export default function AuthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  // 모달 상태 추가
  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  // Google 로그인 설정
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: "232207972245-eqs5voukc84bq1ehumq8kue98v58pap8.apps.googleusercontent.com",
    androidClientId: "232207972245-ffc2k7o5rag3mbm3ovh5s56f6ov82183.apps.googleusercontent.com",
    iosClientId: "232207972245-fkh0ree3o2d1i5022lki16691e9nee9e.apps.googleusercontent.com",
    scopes: ["profile", "email"],
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      const credential = GoogleAuthProvider.credential(
        authentication?.idToken,
        authentication?.accessToken
      );
      handleGoogleSignIn(credential);
    }
  }, [response]);

  const handleGoogleSignIn = async (credential: any) => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithCredential(auth, credential);
      
      // Firestore에 사용자 정보 저장/업데이트
      await setDoc(
        doc(db, "users", result.user.uid),
        {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: new Date().toISOString(),
          spouseStatus: 'none',
          onboardingCompleted: false,
        },
        { merge: true }
      );

      console.log("Google 로그인 성공:", result.user.email);
      router.replace("/");
    } catch (error: any) {
      console.error("Google 로그인 실패:", error);
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        // 회원가입
        if (!name.trim()) {
          setError("이름을 입력해주세요.");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Firestore에 사용자 정보 저장
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: userCredential.user.email,
          displayName: name,
          createdAt: new Date().toISOString(),
          spouseStatus: 'none',
          onboardingCompleted: false,
        });

        console.log("회원가입 성공:", userCredential.user.email);
        router.replace("/");
      } else {
        // 로그인
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("로그인 성공:", userCredential.user.email);
        router.replace("/");
      }
    } catch (error: any) {
      console.error("인증 오류:", error);
      let errorMessage = "오류가 발생했습니다.";
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = "유효하지 않은 이메일입니다.";
          break;
        case 'auth/user-disabled':
          errorMessage = "비활성화된 계정입니다.";
          break;
        case 'auth/user-not-found':
          errorMessage = "사용자를 찾을 수 없습니다.";
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-login-credentials':
          errorMessage = "이메일 또는 비밀번호가 잘못되었습니다.";
          break;
        case 'auth/email-already-in-use':
          errorMessage = "이미 사용 중인 이메일입니다.";
          break;
        case 'auth/weak-password':
          errorMessage = "비밀번호는 6자 이상이어야 합니다.";
          break;
        default:
          errorMessage = error.message || "오류가 발생했습니다.";
      }
      setError(errorMessage);
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("비밀번호 재설정을 위해 이메일을 입력해주세요.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("알림", "비밀번호 재설정 이메일을 전송했습니다.");
    } catch (error: any) {
      setError("비밀번호 재설정 이메일 전송에 실패했습니다.");
    }
  };

  const handleGooglePress = () => {
    setError("");
    promptAsync();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* 로고 섹션 */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="heart" size={32} color="#FFFFFF" />
              </View>
            </View>
            <DefaultText style={styles.appTitle}>토닥토닥</DefaultText>
            <DefaultText style={styles.appSubtitle}>
              매일의 작은 기록이{"\n"}더 나은 부부 관계를 만듭니다
            </DefaultText>
          </View>

          {/* 버튼 섹션 */}
          <View style={styles.buttonSection}>
            {/* 구글 로그인 버튼 (메인) */}
            <TouchableOpacity
              style={[styles.googleButton, loading && styles.disabledButton]}
              onPress={handleGooglePress}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading && !showEmailAuth ? (
                <ActivityIndicator size="small" color="#637788" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <DefaultText style={styles.googleButtonText}>
                    Google로 시작하기
                  </DefaultText>
                </>
              )}
            </TouchableOpacity>

            {/* 구분선 */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <DefaultText style={styles.dividerText}>또는</DefaultText>
              <View style={styles.dividerLine} />
            </View>

            {/* 이메일 로그인 토글 */}
            {!showEmailAuth ? (
              <TouchableOpacity
                style={styles.emailToggleButton}
                onPress={() => setShowEmailAuth(true)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={18} color="#637788" />
                <DefaultText style={styles.emailToggleText}>
                  이메일로 계속하기
                </DefaultText>
              </TouchableOpacity>
            ) : (
              /* 이메일 로그인 폼 */
              <View style={styles.emailForm}>
                {/* 이름 입력 (회원가입 시에만) */}
                {isSignUp && (
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={18} color="#8A94A6" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="이름을 입력하세요"
                      placeholderTextColor="#8A94A6"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                {/* 이메일 입력 */}
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color="#8A94A6" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="이메일을 입력하세요"
                    placeholderTextColor="#8A94A6"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* 비밀번호 입력 */}
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color="#8A94A6" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="비밀번호를 입력하세요"
                    placeholderTextColor="#8A94A6"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                {/* 로그인/회원가입 버튼 */}
                <TouchableOpacity
                  style={[styles.emailButton, loading && styles.disabledButton]}
                  onPress={handleEmailAuth}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading && showEmailAuth ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <DefaultText style={styles.emailButtonText}>
                      {isSignUp ? "회원가입" : "로그인"}
                    </DefaultText>
                  )}
                </TouchableOpacity>

                {/* 모드 전환 및 추가 옵션 */}
                <View style={styles.authOptions}>
                  <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                    <DefaultText style={styles.linkText}>
                      {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
                    </DefaultText>
                  </TouchableOpacity>

                  {!isSignUp && (
                    <TouchableOpacity onPress={handleForgotPassword}>
                      <DefaultText style={styles.linkText}>
                        비밀번호를 잊으셨나요?
                      </DefaultText>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 뒤로가기 */}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setShowEmailAuth(false);
                    setError("");
                    setEmail("");
                    setPassword("");
                    setName("");
                  }}
                >
                  <DefaultText style={styles.backButtonText}>
                    ← 뒤로가기
                  </DefaultText>
                </TouchableOpacity>
              </View>
            )}

            {/* 에러 메시지 */}
            {error ? (
              <View style={styles.errorContainer}>
                <DefaultText style={styles.errorText}>{error}</DefaultText>
              </View>
            ) : null}
          </View>

          {/* 하단 정보 - 수정된 부분 */}
          <View style={styles.bottomSection}>
            {/* 약관 동의 문구 */}
            <DefaultText style={styles.agreementText}>
              로그인 시{' '}
              <DefaultText
                style={styles.linkTextInline}
                onPress={() => setTermsVisible(true)}
              >
                서비스 이용약관
              </DefaultText>
              {' '}및{'\n'}
              <DefaultText
                style={styles.linkTextInline}
                onPress={() => setPrivacyVisible(true)}
              >
                개인정보 처리방침
              </DefaultText>
              에 동의하게 됩니다.
            </DefaultText>

            <View style={styles.versionContainer}>
              <DefaultText style={styles.versionText}>v1.0.0</DefaultText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 모달 컴포넌트들 추가 */}
      <TermsModal
        visible={termsVisible}
        onClose={() => setTermsVisible(false)}
        type="terms"
      />
      
      <TermsModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
        type="privacy"
      />
    </KeyboardAvoidingView>
  );
}

// 모달 스타일
const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
});

// 기존 스타일
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 60,
    justifyContent: "space-between",
  },
  
  // 로고 섹션
  logoSection: {
    alignItems: "center",
    marginBottom: 60,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    backgroundColor: "#5B9BD5",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#5B9BD5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: "#637788",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  
  // 버튼 섹션
  buttonSection: {
    width: "100%",
    alignItems: "center",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E8ECEF",
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 12,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8ECEF",
  },
  dividerText: {
    fontSize: 14,
    color: "#8A94A6",
    paddingHorizontal: 16,
  },

  // 이메일 토글 버튼
  emailToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E8ECEF",
  },
  emailToggleText: {
    fontSize: 14,
    color: "#637788",
    marginLeft: 8,
    fontWeight: "500",
  },

  // 이메일 폼
  emailForm: {
    width: "100%",
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1A1A1A",
  },
  emailButton: {
    backgroundColor: "#5B9BD5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 12,
    shadowColor: "#5B9BD5",
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
  authOptions: {
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  backButton: {
    marginTop: 20,
    alignItems: "center",
  },
  backButtonText: {
    color: "#8A94A6",
    fontSize: 14,
  },
  
  // 에러 메시지
  errorContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    textAlign: "center",
  },
  
  // 하단 섹션
  bottomSection: {
    alignItems: "center",
    marginTop: 56,
  },
  agreementText: {
    fontSize: 13,
    color: "#8A94A6",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  linkTextInline: {
    color: "#8A94A6",
    textDecorationLine: "underline",
    fontWeight: "500",
    fontSize: 13,
  },
  trustText: {
    fontSize: 14,
    color: "#637788",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "600",
  },
  linkText: {
    fontSize: 13,
    color: "#5B9BD5",
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  versionText: {
    fontSize: 11,
    color: "#B0B8C1",
  },
});