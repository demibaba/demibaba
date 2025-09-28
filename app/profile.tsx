// app/profile.tsx - 최종 완성 버전 (GAD-7 포함)
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebaseConfig';
import { 
  signOut, 
  deleteUser, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  updateDoc,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import DefaultText from '../components/DefaultText';

const { width } = Dimensions.get('window');

// 성격유형 매핑 (이모지/설명 포함)
const PERSONALITY_TYPES: Record<string, { name: string; emoji: string; description: string } > = {
  social: {
    name: '사교적 감정가',
    emoji: '😊',
    description: '사람들과의 소통을 통해 에너지를 얻고, 감정을 나누며 성장합니다',
  },
  creative: {
    name: '창의적 표현가',
    emoji: '🎨',
    description: '독창적인 방식으로 감정을 표현하며, 예술적 감각이 뛰어납니다',
  },
  analytical: {
    name: '분석적 사고가',
    emoji: '🧐',
    description: '논리적으로 감정을 분석하고, 체계적으로 문제를 해결합니다',
  },
  introspective: {
    name: '내성적 탐구가',
    emoji: '🤔',
    description: '깊이 있는 내면 탐구를 통해 자아를 이해하며, 조용한 성찰을 즐깁니다',
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 유저 데이터 사용 시 안전 접근용 파생값들
  const phq9Score = userData?.phq9?.totalScore as number | undefined;
  const phq9CompletedAt = userData?.phq9?.completedAt as string | undefined;
  const phq9Interpretation = userData?.phq9?.interpretation as string | undefined;
  
  const gad7Score = userData?.gad7?.totalScore as number | undefined;
  const gad7CompletedAt = userData?.gad7?.completedAt as string | undefined;
  const gad7Severity = userData?.gad7?.severity as string | undefined;
  
  const personalityTypeKey = userData?.personalityType?.type as string | undefined;
  const personalityInfo = personalityTypeKey ? PERSONALITY_TYPES[personalityTypeKey] : undefined;
  
  const attachmentTypeKey = userData?.attachmentType?.type as string | undefined;

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // 실시간 데이터 구독
    const unsubscribe = onSnapshot(
      doc(db, 'users', auth.currentUser.uid),
      (doc) => {
        if (doc.exists()) {
          console.log('실시간 데이터 업데이트:', doc.data());
          setUserData(doc.data());
        }
        setLoading(false);
      },
      (error) => {
        console.error('데이터 구독 오류:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 검사별 색상 함수들
  const getPhq9Color = (score: number) => {
    if (score >= 20) return '#EF5350';
    if (score >= 15) return '#FF7043';
    if (score >= 10) return '#FFA726';
    if (score >= 5) return '#FFD54F';
    return '#4CAF50';
  };

  const getGad7Color = (score: number) => {
    if (score >= 15) return '#EF5350';
    if (score >= 10) return '#FFA726';
    if (score >= 5) return '#FFD54F';
    return '#4CAF50';
  };

  const getKmsiColor = (percentage: number) => {
    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 60) return '#66BB6A';
    if (percentage >= 40) return '#FFA726';
    if (percentage >= 20) return '#FF7043';
    return '#EF5350';
  };

  // 재검사 핸들러들
  const handleRetestPhq9 = () => {
    Alert.alert(
      "PHQ-9 재검사",
      "이전 결과가 초기화됩니다. 재검사하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "재검사",
          onPress: () => router.push('/onboarding/phq9?fromProfile=true' as any)
        }
      ]
    );
  };

  const handleRetestGad7 = () => {
    Alert.alert(
      "GAD-7 재검사",
      "이전 결과가 초기화됩니다. 재검사하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "재검사",
          onPress: () => router.push('/assessment/gad7?fromProfile=true' as any)
        }
      ]
    );
  };

  const handleRetestPsychology = () => {
    Alert.alert(
      "성격유형 재검사",
      "이전 결과가 초기화됩니다. 재검사하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "재검사",
          onPress: () => router.push('/onboarding/psychology-test?fromProfile=true' as any)
        }
      ]
    );
  };

  const handleRetestAttachment = () => {
    Alert.alert(
      "애착유형 재검사",
      "이전 결과가 초기화됩니다. 재검사하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "재검사",
          onPress: () => router.push('/onboarding/attachment-test?fromProfile=true' as any)
        }
      ]
    );
  };

  const handleKmsiTest = () => {
    router.push('/assessment/kmsi' as any);
  };

  const handleLogout = () => {
    Alert.alert(
      "로그아웃",
      "정말 로그아웃하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "로그아웃", 
          style: "destructive",
          onPress: async () => {
            await signOut(auth);
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "회원 탈퇴",
      "정말 탈퇴하시겠습니까?\n\n⚠️ 주의사항:\n• 모든 일기 기록이 삭제됩니다\n• 배우자 연결이 해제됩니다\n• 심리검사 결과도 삭제됩니다\n• 복구가 불가능합니다",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "탈퇴하기", 
          style: "destructive",
          onPress: () => {
            setPassword('');
            setShowPasswordModal(true);
          }
        }
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (!password) {
      Alert.alert("오류", "비밀번호를 입력해주세요");
      return;
    }

    setIsDeleting(true);

    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        Alert.alert("오류", "로그인 정보를 확인할 수 없습니다");
        setShowPasswordModal(false);
        setIsDeleting(false);
        return;
      }
      
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      const userId = auth.currentUser.uid;
      
      if (userData?.spouseId) {
        await updateDoc(doc(db, 'users', userData.spouseId), {
          spouseId: null,
          spouseStatus: 'none'
        });
      }
      
      const diaries = await getDocs(
        query(collection(db, 'diaries'), where('userId', '==', userId))
      );
      
      const batch = writeBatch(db);
      diaries.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      await deleteDoc(doc(db, 'users', userId));
      await deleteUser(auth.currentUser);
      
      setShowPasswordModal(false);
      Alert.alert("탈퇴 완료", "이용해주셔서 감사했습니다.");
      router.replace('/');
      
    } catch (error: any) {
      console.error('계정 삭제 실패:', error);
      setIsDeleting(false);
      
      if (error.code === 'auth/wrong-password') {
        Alert.alert("인증 실패", "비밀번호가 올바르지 않습니다");
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          "재로그인 필요",
          "보안을 위해 다시 로그인 후 탈퇴를 진행해주세요."
        );
        await signOut(auth);
        router.replace('/');
      } else {
        Alert.alert("오류", "탈퇴 처리 중 문제가 발생했습니다.");
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
          <DefaultText style={styles.headerTitle}>프로필</DefaultText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 사용자 정보 */}
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <DefaultText style={styles.avatarText}>
                {userData?.displayName?.charAt(0) || '?'}
              </DefaultText>
            </View>
            <DefaultText style={styles.userName}>
              {userData?.displayName || '사용자'}
            </DefaultText>
            <DefaultText style={styles.userEmail}>
              {userData?.email}
            </DefaultText>
          </View>

          {/* 배우자 연결 */}
          <View style={styles.section}>
            <DefaultText style={styles.sectionTitle}>배우자 연결</DefaultText>
            {userData?.spouseId ? (
              <View style={styles.connectedCard}>
                <Ionicons name="heart" size={20} color="#E91E63" />
                <DefaultText style={styles.connectedText}>연결됨</DefaultText>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.connectButton}
                onPress={() => router.push('/spouse-registration' as any)}
              >
                <Ionicons name="link" size={20} color="#4A90E2" />
                <DefaultText style={styles.connectText}>배우자 연결하기</DefaultText>
                <Ionicons name="chevron-forward" size={18} color="#4A90E2" />
              </TouchableOpacity>
            )}
          </View>

          {/* 심리 검사 결과 섹션 */}
          <View style={styles.section}>
            <DefaultText style={styles.sectionTitle}>심리 검사 결과</DefaultText>
            
            {/* PHQ-9 우울 검사 */}
            {phq9Score !== undefined ? (
              <View style={styles.testCard}>
                <View style={styles.testHeader}>
                  <View style={styles.testTitleRow}>
                    <DefaultText style={styles.testName}>우울 선별검사 (PHQ-9)</DefaultText>
                    <TouchableOpacity onPress={handleRetestPhq9}>
                      <DefaultText style={styles.retestText}>재검사</DefaultText>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.testResultRow}>
                    <View style={[styles.scoreBox, { backgroundColor: getPhq9Color(phq9Score || 0) + '20' }]}>
                      <DefaultText style={[styles.scoreText, { color: getPhq9Color(phq9Score || 0) }]}>
                        {phq9Score}점
                      </DefaultText>
                    </View>
                    <DefaultText style={styles.interpretText}>
                      {phq9Interpretation ?? (
                        (phq9Score ?? 0) >= 20 ? '매우 심한 우울' :
                        (phq9Score ?? 0) >= 15 ? '심한 우울' :
                        (phq9Score ?? 0) >= 10 ? '중간 우울' :
                        (phq9Score ?? 0) >= 5 ? '가벼운 우울' : '정상'
                      )}
                    </DefaultText>
                  </View>
                  {phq9CompletedAt && (
                    <DefaultText style={styles.testDate}>
                      검사일: {new Date(phq9CompletedAt).toLocaleDateString()}
                    </DefaultText>
                  )}
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addTestCard} 
                onPress={() => router.push('/onboarding/phq9' as any)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
                <DefaultText style={styles.addTestText}>PHQ-9 우울 검사하기</DefaultText>
              </TouchableOpacity>
            )}

            {/* GAD-7 불안 검사 */}
            {gad7Score !== undefined ? (
              <View style={styles.testCard}>
                <View style={styles.testHeader}>
                  <View style={styles.testTitleRow}>
                    <DefaultText style={styles.testName}>불안 선별검사 (GAD-7)</DefaultText>
                    <TouchableOpacity onPress={handleRetestGad7}>
                      <DefaultText style={styles.retestText}>재검사</DefaultText>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.testResultRow}>
                    <View style={[styles.scoreBox, { backgroundColor: getGad7Color(gad7Score || 0) + '20' }]}>
                      <DefaultText style={[styles.scoreText, { color: getGad7Color(gad7Score || 0) }]}>
                        {gad7Score}점
                      </DefaultText>
                    </View>
                    <DefaultText style={styles.interpretText}>
                      {gad7Severity || (
                        (gad7Score ?? 0) >= 15 ? '심한 불안' :
                        (gad7Score ?? 0) >= 10 ? '중간 불안' :
                        (gad7Score ?? 0) >= 5 ? '가벼운 불안' : '정상'
                      )}
                    </DefaultText>
                  </View>
                  {gad7CompletedAt && (
                    <DefaultText style={styles.testDate}>
                      검사일: {new Date(gad7CompletedAt).toLocaleDateString()}
                    </DefaultText>
                  )}
                  {(gad7Score ?? 0) >= 10 && (
                    <View style={styles.warningBox}>
                      <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
                      <DefaultText style={styles.warningText}>
                        전문가 상담을 고려해보세요
                      </DefaultText>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addTestCard} 
                onPress={() => router.push('/assessment/gad7' as any)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
                <DefaultText style={styles.addTestText}>GAD-7 불안 검사하기</DefaultText>
              </TouchableOpacity>
            )}

            {/* 성격유형 */}
            {personalityTypeKey ? (
              <View style={styles.testCard}>
                <View style={styles.testHeader}>
                  <View style={styles.testTitleRow}>
                    <DefaultText style={styles.testName}>성격 유형</DefaultText>
                    <TouchableOpacity onPress={handleRetestPsychology}>
                      <DefaultText style={styles.retestText}>재검사</DefaultText>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.personalityResult}>
                    <View style={styles.personalityTypeBox}>
                      <DefaultText style={styles.personalityType}>
                        {personalityInfo?.emoji ? `${personalityInfo.emoji} ${personalityInfo.name}` : (personalityTypeKey || '성격유형')}
                      </DefaultText>
                    </View>
                    {(personalityInfo?.description || userData?.personalityResult?.description) && (
                      <DefaultText style={styles.personalityDesc}>
                        {personalityInfo?.description ?? userData?.personalityResult?.description}
                      </DefaultText>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addTestCard} 
                onPress={() => router.push('/onboarding/psychology-test' as any)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
                <DefaultText style={styles.addTestText}>성격유형 검사하기</DefaultText>
              </TouchableOpacity>
            )}

            {/* 애착유형 */}
            {userData?.attachmentType ? (
              <View style={styles.testCard}>
                <View style={styles.testHeader}>
                  <View style={styles.testTitleRow}>
                    <DefaultText style={styles.testName}>애착 유형</DefaultText>
                    <TouchableOpacity onPress={handleRetestAttachment}>
                      <DefaultText style={styles.retestText}>재검사</DefaultText>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.attachmentResult}>
                    <View style={styles.attachmentTypeBox}>
                      <DefaultText style={styles.attachmentTypeText}>
                        {attachmentTypeKey === 'secure' ? '안정형' :
                         attachmentTypeKey === 'anxious' ? '불안형' :
                         attachmentTypeKey === 'avoidant' ? '회피형' :
                         attachmentTypeKey === 'disorganized' ? '혼란형' : (attachmentTypeKey || '미확인')}
                      </DefaultText>
                    </View>
                    {userData?.attachmentInfo?.description && (
                      <DefaultText style={styles.attachmentDesc}>
                        {userData.attachmentInfo?.description}
                      </DefaultText>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addTestCard} 
                onPress={() => router.push('/onboarding/attachment-test' as any)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
                <DefaultText style={styles.addTestText}>애착유형 검사하기</DefaultText>
              </TouchableOpacity>
            )}

            {/* K-MSI 관계만족도 - 배우자 연결시만 */}
            {userData?.spouseId && (
              userData?.kmsiScore !== undefined ? (
                <View style={styles.testCard}>
                  <View style={styles.testHeader}>
                    <View style={styles.testTitleRow}>
                      <DefaultText style={styles.testName}>관계 만족도 (K-MSI)</DefaultText>
                      <TouchableOpacity onPress={handleKmsiTest}>
                        <DefaultText style={styles.retestText}>재검사</DefaultText>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.testResultRow}>
                      <View style={[styles.scoreBox, { backgroundColor: getKmsiColor(userData.kmsiScore) + '20' }]}>
                        <DefaultText style={[styles.scoreText, { color: getKmsiColor(userData.kmsiScore) }]}>
                          {userData.kmsiScore}%
                        </DefaultText>
                      </View>
                      <DefaultText style={styles.interpretText}>
                        {userData.kmsiScore >= 80 ? '매우 만족' :
                         userData.kmsiScore >= 60 ? '만족' :
                         userData.kmsiScore >= 40 ? '보통' :
                         userData.kmsiScore >= 20 ? '불만족' : '매우 불만족'}
                      </DefaultText>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addTestCard} 
                  onPress={handleKmsiTest}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
                  <DefaultText style={styles.addTestText}>K-MSI 관계만족도 검사하기</DefaultText>
                </TouchableOpacity>
              )
            )}

            {/* 검사 안내 */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={14} color="#666" />
              <DefaultText style={styles.infoText}>
                모든 검사는 선별 목적이며, 정확한 진단은 전문가 상담이 필요합니다
              </DefaultText>
            </View>
          </View>

          {/* 메뉴 */}
          <View style={styles.menuSection}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => router.push('/reports' as any)}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="bar-chart-outline" size={20} color="#666" />
                <DefaultText style={styles.menuText}>AI 리포트</DefaultText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={styles.menuLeft}>
                <Ionicons name="log-out-outline" size={20} color="#666" />
                <DefaultText style={styles.menuText}>로그아웃</DefaultText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
              <View style={styles.menuLeft}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <DefaultText style={[styles.menuText, { color: '#FF3B30' }]}>
                  회원탈퇴
                </DefaultText>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* 비밀번호 모달 */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <DefaultText style={styles.modalTitle}>본인 확인</DefaultText>
            <DefaultText style={styles.modalDescription}>
              계정 삭제를 위해 비밀번호를 입력해주세요
            </DefaultText>
            <TextInput
              style={styles.passwordInput}
              placeholder="비밀번호"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isDeleting}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
                disabled={isDeleting}
              >
                <DefaultText style={styles.modalButtonTextCancel}>취소</DefaultText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={performAccountDeletion}
                disabled={isDeleting}
              >
                <DefaultText style={styles.modalButtonTextConfirm}>
                  {isDeleting ? '처리중...' : '확인'}
                </DefaultText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  
  // 사용자 카드
  userCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A90E2',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
  },
  
  // 섹션
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  
  // 배우자 연결
  connectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  connectedText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  connectText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    flex: 1,
  },
  
  // 심리 검사
  testCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  testHeader: {
    gap: 8,
  },
  testTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  retestText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  testResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  scoreBox: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  interpretText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  testDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 11,
    color: '#FF6B6B',
  },
  addTestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  addTestText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  
  // 성격유형
  personalityResult: {
    marginTop: 8,
  },
  personalityTypeBox: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  personalityType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  personalityDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  
  // 애착유형
  attachmentResult: {
    marginTop: 8,
  },
  attachmentTypeBox: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  attachmentTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  attachmentDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  
  // 정보 박스
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
  
  // 메뉴
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
  },
  
  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: width - 48,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111518',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#637788',
    marginBottom: 20,
    lineHeight: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#E8ECEF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F0F2F4',
  },
  modalButtonConfirm: {
    backgroundColor: '#EF5350',
  },
  modalButtonTextCancel: {
    color: '#637788',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});