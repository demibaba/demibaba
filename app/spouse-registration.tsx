// app/spouse-registration.tsx - 토닥토닥 매직 링크 버전
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

    // 실시간으로 연결 상태 확인
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      const data = doc.data();
      if (data?.spouseStatus === 'connected') {
        setPartnerConnected(true);
        setTimeout(() => {
          router.replace('/calendar');
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [inviteSent, currentUser]);

  // 매직 링크 생성 및 공유
  const handleShareMagicLink = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // 유니크한 초대 ID 생성 (타임스탬프 + 랜덤)
      const inviteId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Firestore에 초대 정보 저장
      await setDoc(doc(db, 'invitations', inviteId), {
        inviterId: currentUser.uid,
        inviterName: currentUser.displayName || '토닥이',
        inviterEmail: currentUser.email,
        createdAt: new Date(),
        status: 'pending'
      });

      // 매직 링크 생성
      const magicLink = `https://todaktodak.app/join/${inviteId}`;
      
      // 공유 메시지
      const message = `${currentUser.displayName || '소중한 사람'}님이 토닥토닥에 초대했어요 💕

👇 아래 링크를 눌러주세요
${magicLink}

함께 마음을 나누고 일상을 기록해요 ✨`;

      // 공유하기
      const result = await Share.share({
        message: message,
        title: '토닥토닥 초대장 💌'
      });

      if (result.action === Share.sharedAction) {
        setInviteSent(true);
        setLoading(false);
      } else {
        setLoading(false);
      }

    } catch (error) {
      console.error('매직 링크 생성 오류:', error);
      Alert.alert('오류', '초대 링크 생성에 실패했습니다.');
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
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={80} color="#87C4A3" />
          <DefaultText style={styles.successTitle}>연결 완료!</DefaultText>
          <DefaultText style={styles.successText}>
            이제 함께 토닥토닥을 시작해요 💕
          </DefaultText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F7F3E9', '#F0EBE0']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {!inviteSent ? (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="people" size={60} color="#C9B8A3" />
              </View>
              
              <DefaultText style={styles.title}>
                AI가 읽어주는 우리의 마음
              </DefaultText>
              
              <DefaultText style={styles.description}>
                서로를 더 잘 이해할 수 있도록{'\n'}
                AI가 감정 패턴을 분석해드려요
              </DefaultText>

              <TouchableOpacity
                style={[styles.inviteButton, loading && styles.disabledButton]}
                onPress={handleShareMagicLink}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                    <DefaultText style={styles.inviteButtonText}>
                      초대 링크 보내기
                    </DefaultText>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <DefaultText style={styles.skipButtonText}>
                  혼자 시작하기
                </DefaultText>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color="#C9B8A3" />
              <DefaultText style={styles.waitingTitle}>
                초대를 보냈어요!
              </DefaultText>
              <DefaultText style={styles.waitingText}>
                상대방이 링크를 클릭하면{'\n'}
                자동으로 연결됩니다
              </DefaultText>
              
              <TouchableOpacity 
                style={styles.laterButton} 
                onPress={handleSkip}
              >
                <DefaultText style={styles.laterButtonText}>
                  일단 시작하기
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
    backgroundColor: '#F7F3E9',
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#8D7A65',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  inviteButton: {
    backgroundColor: '#C9B8A3',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#D4C5B0',
  },
  skipButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: '#A08B6F',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  waitingContainer: {
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginTop: 30,
    marginBottom: 12,
  },
  waitingText: {
    fontSize: 16,
    color: '#8D7A65',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  laterButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#C9B8A3',
  },
  laterButtonText: {
    color: '#C9B8A3',
    fontSize: 16,
    fontWeight: '600',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginTop: 20,
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    color: '#8D7A65',
    textAlign: 'center',
  },
});