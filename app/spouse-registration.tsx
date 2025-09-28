// app/spouse-registration.tsx — 블루 계열 + 의료/전문 톤 + 초대 토큰 만료(24h)
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share } from 'react-native';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import DefaultText from '../components/DefaultText';
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

export default function SpouseRegistrationPage() {
  const [loading, setLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser || !inviteSent) return;
    // 실시간 연결 상태 확인 (accepted/connected)
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      const data = snap.data();
      if (data?.spouseStatus === 'accepted' || data?.spouseStatus === 'connected') {
        setPartnerConnected(true);
        setTimeout(() => {
          Alert.alert(
            '연결 확인',
            '배우자 프로파일 연결이 확인되었습니다.\n\n다음 단계(GAD-7)를 진행합니다.',
            [
              { text: '확인', onPress: () => router.replace('/onboarding/gad7' as any) },
            ],
            { cancelable: false }
          );
        }, 600);
      }
    });
    return () => unsub();
  }, [inviteSent, currentUser]);

  // 초대 링크 생성 및 공유 (24시간 유효)
  const handleShareMagicLink = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const inviteId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      await setDoc(doc(db, 'invitations', inviteId), {
        inviterId: currentUser.uid,
        inviterName: currentUser.displayName || '사용자',
        inviterEmail: currentUser.email || '',
        createdAt: serverTimestamp(),
        expiresAt,            // 만료시각 저장 (클라이언트/클라우드 함수 양쪽에서 검증)
        singleUse: true,
        status: 'pending',
      });

      // (배포 시) 이 링크는 딥링크/유니버설링크로 연결되도록 설정 권장
      const magicLink = `https://todaktodak.app/join/${inviteId}`;

      const message = `[토닥토닥 관계 분석 프로그램]

배우자께서 프로그램 참여를 요청하였습니다.

아래 링크를 통해 참여를 완료해 주십시오:
${magicLink}

• 과학적 심리검사 기반(PHQ-9, K-MSI 등)
• 주 1회 AI 리포트 제공
• 관계 패턴 및 위험 요인 모니터링
※ 본 초대는 발송 시점으로부터 24시간 동안 유효합니다.`;

      const result = await Share.share({ message, title: '관계 분석 초대' });
      if (result.action) setInviteSent(true);
    } catch (e) {
      console.error('초대 생성 오류:', e);
      Alert.alert('오류', '초대 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => router.replace('/onboarding/gad7' as any);

  if (partnerConnected) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[theme.surface, theme.bg]} style={styles.gradient}>
          <View style={styles.centerWrap}>
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={60} color={theme.primary} />
              </View>
              <DefaultText style={styles.successTitle}>연결 확인</DefaultText>
              <DefaultText style={styles.successDesc}>
                배우자 프로파일 연결이 확인되었습니다. AI 기반 관계 분석이 시작됩니다.
              </DefaultText>
              <ActivityIndicator color={theme.primary} style={{ marginTop: 8 }} />
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.surface, theme.bg]} style={styles.gradient}>
        <View style={styles.content}>
          {!inviteSent ? (
            <>
              <View style={styles.heroIcon}>
                <Ionicons name="people" size={50} color={theme.primary} />
              </View>

              <DefaultText style={styles.title}>토닥토닥 </DefaultText>
              <DefaultText style={styles.subtitle}>
                간단한 체크인과 과학적 심리검사를 통해 AI가 관계 분석을 제공합니다
              </DefaultText>

              {/* 특징 카드 */}
              <View style={styles.benefitCard}>
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="shield-checkmark" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DefaultText style={styles.benefitText}>핵심 패턴 분석</DefaultText>
                    <DefaultText style={styles.benefitSub}>비판·경멸·방어·회피 지표 모니터링</DefaultText>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="analytics" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DefaultText style={styles.benefitText}>주간 AI 리포트</DefaultText>
                    <DefaultText style={styles.benefitSub}>경향·리스크·개선 권고 제공</DefaultText>
                  </View>
                </View>

                <View style={styles.benefitItem} >
                  <View style={styles.benefitIcon}>
                    <Ionicons name="document-text" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DefaultText style={styles.benefitText}>맞춤형 가이드</DefaultText>
                    <DefaultText style={styles.benefitSub}>애착유형 기반 소통 전략</DefaultText>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.ctaButton, loading && styles.ctaDisabled]}
                onPress={handleShareMagicLink}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <DefaultText style={styles.ctaText}>배우자 초대</DefaultText>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip} activeOpacity={0.8}>
                <DefaultText style={styles.secondaryText}>개인 분석 진행</DefaultText>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.waitingWrap}>
              <ActivityIndicator size="large" color={theme.primary} />
              <DefaultText style={styles.waitingTitle}>배우자 연결 확인 중…</DefaultText>
              <DefaultText style={styles.waitingText}>
                초대가 발송되었습니다. {'\n'}연결은 발송 후 24시간 내 수락이 필요합니다.
              </DefaultText>

              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
                <DefaultText style={styles.infoText}>
                  연결 완료 시 K-MSI 관계 패턴 분석을 진행할 수 있습니다.
                </DefaultText>
              </View>

              <TouchableOpacity style={styles.secondaryOutline} onPress={handleSkip} activeOpacity={0.8}>
                <DefaultText style={styles.secondaryOutlineText}>개인 분석으로 계속</DefaultText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  gradient: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },

  // 헤더/카피
  heroIcon: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 8, textAlign: 'center', letterSpacing: -0.2 },
  subtitle: { fontSize: 14, color: theme.subtext, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  // 특징 카드
  benefitCard: {
    width: '100%', backgroundColor: theme.bg, borderRadius: 12, padding: 18,
    borderWidth: 1, borderColor: theme.border, marginBottom: 24,
  },
  benefitItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  benefitIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  benefitText: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 2 },
  benefitSub: { fontSize: 12, color: theme.subtext },

  // 버튼
  ctaButton: { width: '100%', backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  ctaDisabled: { backgroundColor: '#9DC3EE' },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 18 },
  secondaryText: { color: theme.subtext, fontSize: 14 },

  // 대기 화면
  waitingWrap: { alignItems: 'center', paddingHorizontal: 8 },
  waitingTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 18, marginBottom: 8 },
  waitingText: { fontSize: 14, color: theme.subtext, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 20,
  },
  infoText: { fontSize: 12, color: theme.subtext, marginLeft: 8, flex: 1, lineHeight: 18 },
  secondaryOutline: {
    backgroundColor: theme.bg, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 22,
    borderWidth: 1, borderColor: theme.primary,
  },
  secondaryOutlineText: { color: theme.primary, fontSize: 15, fontWeight: '600' },

  // 성공 화면
  successCard: {
    backgroundColor: theme.bg, padding: 36, borderRadius: 16, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  successIcon: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: theme.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 8 },
  successDesc: { fontSize: 14, color: theme.subtext, textAlign: 'center' },
});
