// app/spouse-registration.tsx - 토닥토닥 전문가 톤 버전
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share } from 'react-native';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import DefaultText from '../components/DefaultText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SpouseRegistrationPage() {
  const [loading, setLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser || !inviteSent) return;

    // 실시간으로 연결 상태 확인 (accepted/connected 모두 허용)
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      const data = doc.data();
      if (data?.spouseStatus === 'accepted' || data?.spouseStatus === 'connected') {
        setPartnerConnected(true);
        // 연결 완료 후 K-MSI 분석 안내
        setTimeout(() => {
          showKMSIPrompt();
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [inviteSent, currentUser]);

  // K-MSI 분석 안내 - 전문가 톤
  const showKMSIPrompt = () => {
    Alert.alert(
      '연결 확인',
      '배우자와의 연결이 확인되었습니다.\n\nK-MSI 관계 패턴 분석을 시작하시겠습니까?',
      [
        {
          text: '나중에',
          style: 'cancel',
          onPress: () => router.replace('/calendar')
        },
        {
          text: '분석 시작',
          onPress: () => router.replace('/assessment/kmsi')
        }
      ],
      { cancelable: false }
    );
  };

  // 매직 링크 생성 및 공유 - 전문적 메시지
  const handleShareMagicLink = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // 유니크한 초대 ID 생성 (타임스탬프 + 랜덤)
      const inviteId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Firestore에 초대 정보 저장
      await setDoc(doc(db, 'invitations', inviteId), {
        inviterId: currentUser.uid,
        inviterName: currentUser.displayName || '사용자',
        inviterEmail: currentUser.email,
        createdAt: new Date(),
        status: 'pending'
      });

      // 매직 링크 생성
      const magicLink = `https://todaktodak.app/join/${inviteId}`;
      
      // 전문적인 공유 메시지
      const message = `[토닥토닥 부부관계 분석 프로그램]

${currentUser.displayName || '배우자'}님이 관계 분석을 요청했습니다.

아래 링크로 접속하여 프로그램에 참여하십시오:
${magicLink}

• Gottman Method 기반 과학적 분석
• 주 1회 전문 분석 리포트 제공
• 관계 패턴 실시간 모니터링`;

      // 공유하기
      const result = await Share.share({
        message: message,
        title: '토닥토닥 프로그램 참여 요청'
      });

      if (result.action === Share.sharedAction) {
        setInviteSent(true);
        setLoading(false);
      } else {
        setLoading(false);
      }

    } catch (error) {
      console.error('연결 코드 생성 오류:', error);
      Alert.alert('오류', '연결 코드 생성에 실패했습니다. 다시 시도하십시오.');
      setLoading(false);
    }
  };

  // 나중에 연결하기
  const handleSkip = () => {
    router.replace('/calendar');
  };

  if (partnerConnected) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAFBFC', '#FFFFFF']}
          style={styles.gradient}
        >
          <View style={styles.successContainer}>
            <View style={styles.successCard}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={60} color="#5B9BD5" />
              </View>
              <DefaultText style={styles.successTitle}>연결 확인</DefaultText>
              <DefaultText style={styles.successText}>
                부부 프로파일이 생성되었습니다
              </DefaultText>
              <DefaultText style={styles.successSubtext}>
                관계 분석 페이지로 이동합니다
              </DefaultText>
              
              {/* 로딩 인디케이터 */}
              <View style={styles.loadingDots}>
                <ActivityIndicator size="small" color="#5B9BD5" />
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAFBFC', '#FFFFFF']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {!inviteSent ? (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="people" size={50} color="#5B9BD5" />
              </View>
              
              <DefaultText style={styles.title}>
             토닥토닥
              </DefaultText>
              
              <DefaultText style={styles.description}>
              각자의 하루를 기록하면{'\n'}
              AI가 관계 패턴을 분석해드려요
              </DefaultText>

              {/* 프로그램 특징 카드 - 전문적 표현 */}
              <View style={styles.benefitCard}>
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="shield-checkmark" size={18} color="#5B9BD5" />
                  </View>
                  <View style={styles.benefitContent}>
                    <DefaultText style={styles.benefitText}>4대 주요 패턴 분석</DefaultText>
                    <DefaultText style={styles.benefitSubText}>
                      비판·경멸·방어·회피 패턴 자동 감지
                    </DefaultText>
                  </View>
                </View>
                
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="analytics" size={18} color="#5B9BD5" />
                  </View>
                  <View style={styles.benefitContent}>
                    <DefaultText style={styles.benefitText}>주간 전문 리포트</DefaultText>
                    <DefaultText style={styles.benefitSubText}>
                      긍정/부정 상호작용 비율 5:1 관리
                    </DefaultText>
                  </View>
                </View>
                
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="document-text" size={18} color="#5B9BD5" />
                  </View>
                  <View style={styles.benefitContent}>
                    <DefaultText style={styles.benefitText}>맞춤형 개선 방안</DefaultText>
                    <DefaultText style={styles.benefitSubText}>
                      애착유형별 소통 전략 제공
                    </DefaultText>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.inviteButton, loading && styles.disabledButton]}
                onPress={handleShareMagicLink}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <DefaultText style={styles.inviteButtonText}>
                    배우자 초대하기
                  </DefaultText>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <DefaultText style={styles.skipButtonText}>
                  개인 분석으로 시작
                </DefaultText>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color="#5B9BD5" />
              
              <DefaultText style={styles.waitingTitle}>
                연결 대기 중
              </DefaultText>
              <DefaultText style={styles.waitingText}>
                배우자 계정 연결을 대기하고 있습니다{'\n'}
                연결 코드가 전송되었습니다
              </DefaultText>
              
              {/* 대기 중 안내 - 전문적 톤 */}
              <View style={styles.tipCard}>
                <Ionicons name="information-circle-outline" size={20} color="#5B9BD5" />
                <DefaultText style={styles.tipText}>
                  연결 완료 시 K-MSI 관계 패턴 분석을{'\n'}
                  진행할 수 있습니다
                </DefaultText>
              </View>
              
              <TouchableOpacity 
                style={styles.laterButton} 
                onPress={handleSkip}
              >
                <DefaultText style={styles.laterButtonText}>
                  개인 모드로 진행
                </DefaultText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FAFBFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: '#637788',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  
  // 혜택 카드 스타일 - 전문적 디자인
  benefitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAFBFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 3,
  },
  benefitSubText: {
    fontSize: 12,
    color: '#637788',
    lineHeight: 17,
  },
  
  inviteButton: {
    backgroundColor: '#198ae6',
    paddingVertical: 15,
    paddingHorizontal: 36,
    borderRadius: 8,
    width: '100%',
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: '#637788',
    fontSize: 14,
  },
  
  // 대기 화면 스타일
  waitingContainer: {
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 30,
    marginBottom: 12,
  },
  waitingText: {
    fontSize: 16,
    color: '#637788',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  
  // 팁 카드 스타일
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  tipText: {
    fontSize: 13,
    color: '#637788',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  
  laterButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#5B9BD5',
  },
  laterButtonText: {
    color: '#5B9BD5',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // 성공 화면 스타일
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FAFBFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#637788',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#8A94A6',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingDots: {
    marginTop: 8,
  },
});