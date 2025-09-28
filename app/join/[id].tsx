// app/join/[id].tsx - 매직링크 수락 페이지
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import DefaultText from '../../components/DefaultText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const theme = {
  primary: '#4A90E2',
  primaryDark: '#1976D2',
  text: '#111518',
  subtext: '#637788',
  bg: '#FFFFFF',
  surface: '#FAFBFC',
  border: '#E8ECEF',
};

export default function JoinInvitePage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      Alert.alert('오류', '잘못된 초대 링크입니다.');
      return;
    }
    
    checkInvitation();
  }, [id]);

  const checkInvitation = async () => {
    try {
      setLoading(true);
      
      // 초대 정보 확인
      const inviteDoc = await getDoc(doc(db, 'invitations', id as string));
      
      if (!inviteDoc.exists()) {
        Alert.alert('초대 무효', '초대 링크가 존재하지 않거나 만료되었습니다.');
        return;
      }
      
      const invite = inviteDoc.data();
      
      // 만료 시간 체크
      if (invite.expiresAt && new Date() > invite.expiresAt.toDate()) {
        Alert.alert('초대 만료', '이 초대는 24시간이 지나 만료되었습니다.');
        return;
      }
      
      // 이미 사용된 초대인지 체크
      if (invite.status !== 'pending') {
        Alert.alert('초대 완료', '이미 처리된 초대입니다.');
        return;
      }
      
      setInviteData(invite);
      
    } catch (error) {
      console.error('초대 확인 오류:', error);
      Alert.alert('오류', '초대 정보를 확인할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!auth.currentUser || !inviteData) return;
    
    setProcessing(true);
    
    try {
      const currentUser = auth.currentUser;
      const inviterId = inviteData.inviterId;
      
      // 1. 현재 사용자를 배우자로 설정
      await updateDoc(doc(db, 'users', currentUser.uid), {
        spouseId: inviterId,
        spouseStatus: 'accepted',
        updatedAt: serverTimestamp()
      });
      
      // 2. 초대한 사용자에게도 연결
      await updateDoc(doc(db, 'users', inviterId), {
        spouseId: currentUser.uid,
        spouseStatus: 'accepted',
        updatedAt: serverTimestamp()
      });
      
      // 3. 초대 상태 업데이트
      await updateDoc(doc(db, 'invitations', id as string), {
        status: 'accepted',
        partnerId: currentUser.uid,
        acceptedAt: serverTimestamp()
      });
      
      Alert.alert(
        '연결 완료! 🎉',
        '배우자 연결이 성공적으로 완료되었습니다.\n\n함께 관계 분석을 시작해보세요!',
        [
          { 
            text: '시작하기', 
            onPress: () => router.replace('/calendar')
          }
        ]
      );
      
    } catch (error) {
      console.error('초대 수락 오류:', error);
      Alert.alert('오류', '연결 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setProcessing(false);
    }
  };

  const requiresLogin = () => {
    Alert.alert(
      '로그인 필요',
      '배우자 연결을 위해 먼저 로그인해주세요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.replace('/') }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[theme.surface, theme.bg]} style={styles.gradient}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.primary} />
            <DefaultText style={styles.loadingText}>초대 정보 확인 중...</DefaultText>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!inviteData) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[theme.surface, theme.bg]} style={styles.gradient}>
          <View style={styles.centerContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={60} color="#E74C3C" />
            </View>
            <DefaultText style={styles.errorTitle}>초대 무효</DefaultText>
            <DefaultText style={styles.errorDesc}>
              초대 링크가 유효하지 않거나 만료되었습니다.
            </DefaultText>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.surface, theme.bg]} style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.inviteCard}>
            <View style={styles.iconWrapper}>
              <Ionicons name="people" size={50} color={theme.primary} />
            </View>
            
            <DefaultText style={styles.title}>배우자 연결 초대</DefaultText>
            
            <View style={styles.inviterInfo}>
              <DefaultText style={styles.inviterText}>
                <DefaultText style={styles.inviterName}>{inviteData.inviterName}</DefaultText>님이
              </DefaultText>
              <DefaultText style={styles.inviterText}>
                토닥토닥 관계 분석에 초대했습니다
              </DefaultText>
            </View>
            
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="analytics" size={16} color={theme.primary} />
                <DefaultText style={styles.benefitText}>주간 AI 관계 분석 리포트</DefaultText>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="shield-checkmark" size={16} color={theme.primary} />
                <DefaultText style={styles.benefitText}>관계 패턴 모니터링</DefaultText>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="heart" size={16} color={theme.primary} />
                <DefaultText style={styles.benefitText}>맞춤형 소통 가이드</DefaultText>
              </View>
            </View>
            
            {auth.currentUser ? (
              <View style={styles.buttonGroup}>
                <TouchableOpacity 
                  style={[styles.acceptButton, processing && styles.buttonDisabled]}
                  onPress={acceptInvitation}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <DefaultText style={styles.acceptButtonText}>초대 수락</DefaultText>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={styles.loginButton} onPress={requiresLogin}>
                  <DefaultText style={styles.loginButtonText}>로그인 후 수락</DefaultText>
                </TouchableOpacity>
              </View>
            )}
            
            <DefaultText style={styles.disclaimer}>
              수락 시 배우자와 감정 데이터를 공유하여 관계 분석을 받을 수 있습니다.
            </DefaultText>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  gradient: { flex: 1 },
  centerContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 32 
  },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 24 
  },
  
  // 로딩 상태
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: theme.subtext, 
    textAlign: 'center' 
  },
  
  // 에러 상태
  errorIcon: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#E74C3C', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  errorDesc: { 
    fontSize: 14, 
    color: theme.subtext, 
    textAlign: 'center', 
    lineHeight: 20 
  },
  
  // 초대 카드
  inviteCard: {
    width: '100%',
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.surface,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: theme.text, 
    marginBottom: 16, 
    textAlign: 'center' 
  },
  
  // 초대자 정보
  inviterInfo: { alignItems: 'center', marginBottom: 24 },
  inviterText: { 
    fontSize: 16, 
    color: theme.subtext, 
    textAlign: 'center',
    lineHeight: 22,
  },
  inviterName: { 
    fontWeight: '600', 
    color: theme.primary 
  },
  
  // 혜택 리스트
  benefitsList: { width: '100%', marginBottom: 28 },
  benefitItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  benefitText: { 
    fontSize: 14, 
    color: theme.text, 
    marginLeft: 10,
    flex: 1,
  },
  
  // 버튼
  buttonGroup: { width: '100%', marginBottom: 16 },
  acceptButton: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  acceptButtonText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  loginButton: {
    backgroundColor: theme.surface,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: theme.primary,
  },
  loginButtonText: { 
    color: theme.primary, 
    fontSize: 16, 
    fontWeight: '600' 
  },
  buttonDisabled: { 
    backgroundColor: '#A0B4D0', 
    opacity: 0.7 
  },
  
  // 안내문
  disclaimer: { 
    fontSize: 12, 
    color: theme.subtext, 
    textAlign: 'center', 
    lineHeight: 16,
    paddingHorizontal: 4,
  },
});