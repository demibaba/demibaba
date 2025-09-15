// app/profile.tsx - 보안 강화된 프로필 페이지
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Dimensions, TextInput, Modal } from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import DefaultText from "../components/DefaultText";
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Ionicons로 통일된 아이콘 컴포넌트들
const UserIcon = () => <Ionicons name="person" size={20} color="#198ae6" />;
const HeartIcon = () => <Ionicons name="heart" size={20} color="#198ae6" />;
const BrainIcon = () => <Ionicons name="compass" size={20} color="#198ae6" />;
const StatsIcon = () => <Ionicons name="bar-chart" size={20} color="#198ae6" />;
const SettingsIcon = () => <Ionicons name="settings" size={20} color="#198ae6" />;
const ReportIcon = () => <Ionicons name="document-text" size={20} color="#198ae6" />;
const RequestIcon = () => <Ionicons name="mail" size={20} color="#198ae6" />;
const LinkIcon = () => <Ionicons name="link" size={20} color="#198ae6" />;
const AlertIcon = () => <Ionicons name="alert-circle" size={18} color="#e73908" />;
const TrendUpIcon = () => <Ionicons name="trending-up" size={16} color="#078838" />;
const TrendDownIcon = () => <Ionicons name="trending-down" size={16} color="#e73908" />;
const AnalyticsIcon = () => <Ionicons name="analytics" size={20} color="#198ae6" />;
const CheckCircleIcon = () => <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
const TimeIcon = () => <Ionicons name="time" size={20} color="#FFA726" />;
const AddCircleIcon = () => <Ionicons name="add-circle" size={20} color="#198ae6" />;

interface AttachmentInfo {
  name: string;
  description: string;
  color: string;
  percentage: string;
  strengths: string[];
  tips: string[];
}

interface UserData {
  displayName?: string;
  email?: string;
  createdAt?: string;
  spouseStatus?: string;
  personalityType?: string;
  personalityResult?: any;
  profileImage?: string;
  attachmentType?: string;
  attachmentInfo?: AttachmentInfo;
  spouseId?: string;
  sternbergType?: string;
  sternbergProfile?: {
    name?: string;
    intimacy?: number;
    passion?: number;
    commitment?: number;
    description?: string;
  };
  assessmentsCompleted?: {
    phq9?: boolean;
    gad7?: boolean;
    kmsi?: boolean;
    dass21?: boolean;
  };
  phq9?: {
    totalScore: number;
    interpretation: string;
    completedAt: string;
  };
  kmsi?: {
    percentage: number;
    interpretation: string;
    completedAt: string;
  };
  gad7?: {
    totalScore: number;
    interpretation: string;
    completedAt: string;
  };
}

interface DiaryEntry {
  date: string;
  emotions: string[];
  text: string;
  instantFeedback?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [attachmentInfo, setAttachmentInfo] = useState<AttachmentInfo | null>(null);
  const [recentEmotionData, setRecentEmotionData] = useState<DiaryEntry[]>([]);
  const [recentDiaries, setRecentDiaries] = useState<any[]>([]);
  const [spouseProfile, setSpouseProfile] = useState<{ displayName?: string; profileImage?: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [diaryStats, setDiaryStats] = useState({
    total: 0,
    thisMonth: 0,
    consecutiveDays: 0
  });

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        if (!auth.currentUser) {
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserData(userData);
          if (userData.attachmentInfo) {
            setAttachmentInfo(userData.attachmentInfo);
          }
          if (userData.spouseId) {
            try {
              const spouse = await getDoc(doc(db, 'users', userData.spouseId));
              if (spouse.exists()) {
                const s = spouse.data() as any;
                setSpouseProfile({ displayName: s.displayName, profileImage: s.profileImage });
              }
            } catch {}
          } else {
            setSpouseProfile(null);
          }
        }

        // 최근 다이어리 가져오기
        const diariesRef = collection(db, "diaries");
        const q = query(
          diariesRef,
          where("userId", "==", auth.currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const recentDiaries: any[] = [];
        querySnapshot.forEach((doc) => {
          recentDiaries.push({ id: doc.id, ...doc.data() });
        });
        setRecentDiaries(recentDiaries);

        // 통계 및 다른 데이터 로드
        await loadDiaryStats();
        await loadRecentEmotionData();
        await checkPendingRequests();

        setLoading(false);
      } catch (error) {
        console.error("사용자 데이터 로드 오류:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const checkPendingRequests = async () => {
    if (!auth.currentUser) return;
    
    try {
      const q = query(
        collection(db, 'spouseRequests'),
        where('recipientId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      setPendingRequests(snapshot.size);
    } catch (error) {
      console.error('요청 확인 오류:', error);
    }
  };

  const loadDiaryStats = async () => {
    if (!auth.currentUser) return;
    
    try {
      const diariesRef = collection(db, "diaries");
      const q = query(
        diariesRef,
        where("userId", "==", auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const total = querySnapshot.size;
      
      // 이번 달 통계 계산
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      let thisMonth = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date) {
          const diaryDate = new Date(data.date);
          if (diaryDate.getMonth() === currentMonth && diaryDate.getFullYear() === currentYear) {
            thisMonth++;
          }
        }
      });
      
      setDiaryStats({
        total,
        thisMonth,
        consecutiveDays: 0
      });
    } catch (error) {
      console.error('다이어리 통계 로드 실패:', error);
    }
  };

  // 최근 7일 간단 데이터 로드
  const loadRecentEmotionData = async () => {
    if (!auth.currentUser) return;
    
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const diariesRef = collection(db, "diaries");
      const q = query(
        diariesRef,
        where("userId", "==", auth.currentUser.uid),
        orderBy("date", "desc"),
        limit(7)
      );
      
      const querySnapshot = await getDocs(q);
      const entries: DiaryEntry[] = [];
      const startDateString = startDate.toISOString().split('T')[0];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.date && typeof data.date === 'string' && startDateString && data.date >= startDateString) {
          entries.push({
            date: data.date,
            emotions: Array.isArray(data.emotions) ? data.emotions : [],
            text: data.text || '',
            instantFeedback: data.instantFeedback || ''
          });
        }
      });
      
      setRecentEmotionData(entries.reverse());
    } catch (error) {
      console.error('최근 감정 데이터 로드 실패:', error);
    }
  };

  // 보안 강화된 회원탈퇴 기능
  const handleDeleteAccount = async () => {
    Alert.alert(
      "계정 삭제",
      "정말 탈퇴하시겠어요?\n\n⚠️ 주의사항:\n• 모든 일기와 감정 데이터가 영구 삭제돼요\n• 배우자와의 연결이 해제돼요\n• 심리검사 결과도 모두 삭제돼요\n• 삭제된 데이터는 복구할 수 없어요",
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
      
      // 재인증
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      
      try {
        await reauthenticateWithCredential(auth.currentUser, credential);
      } catch (authError: any) {
        if (authError.code === 'auth/wrong-password') {
          Alert.alert("인증 실패", "비밀번호가 올바르지 않습니다");
        } else {
          Alert.alert("인증 실패", "본인 확인에 실패했습니다");
        }
        setIsDeleting(false);
        return;
      }
      
      const userId = auth.currentUser.uid;
      
      // 1. 배우자 관계 해제
      if (userData?.spouseId) {
        try {
          const spouseDoc = doc(db, 'users', userData.spouseId);
          await updateDoc(spouseDoc, {
            spouseId: null,
            spouseStatus: 'none'
          });
        } catch (error) {
          console.error('배우자 관계 해제 실패:', error);
        }
      }
      
      // 2. 배우자 요청 삭제
      try {
        const requestsQuery = query(
          collection(db, 'spouseRequests'),
          where('senderId', '==', userId)
        );
        const recipientQuery = query(
          collection(db, 'spouseRequests'),
          where('recipientId', '==', userId)
        );
        
        const [senderSnapshot, recipientSnapshot] = await Promise.all([
          getDocs(requestsQuery),
          getDocs(recipientQuery)
        ]);
        
        const deleteRequestPromises: Promise<void>[] = [];
        senderSnapshot.forEach(doc => deleteRequestPromises.push(deleteDoc(doc.ref)));
        recipientSnapshot.forEach(doc => deleteRequestPromises.push(deleteDoc(doc.ref)));
        await Promise.all(deleteRequestPromises);
      } catch (error) {
        console.error('배우자 요청 삭제 실패:', error);
      }
      
      // 3. 일기 데이터 삭제
      try {
        const diariesQuery = query(
          collection(db, 'diaries'),
          where('userId', '==', userId)
        );
        const diariesSnapshot = await getDocs(diariesQuery);
        const deleteDiaryPromises = diariesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteDiaryPromises);
      } catch (error) {
        console.error('일기 삭제 실패:', error);
      }
      
      // 4. 주간 리포트 삭제
      try {
        const reportsQuery = query(
          collection(db, 'weeklyReports'),
          where('userId', '==', userId)
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        const deleteReportPromises = reportsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteReportPromises);
      } catch (error) {
        console.error('리포트 삭제 실패:', error);
      }
      
      // 5. 사용자 데이터 삭제
      await deleteDoc(doc(db, 'users', userId));
      
      // 6. Firebase Auth 계정 삭제
      await deleteUser(auth.currentUser);
      
      setShowPasswordModal(false);
      Alert.alert("탈퇴 완료", "그동안 토닥토닥을 이용해주셔서 감사했어요.");
      router.replace('/');
      
    } catch (error: any) {
      console.error('계정 삭제 실패:', error);
      setIsDeleting(false);
      
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          "재로그인 필요", 
          "보안을 위해 재로그인이 필요합니다. 로그아웃 후 다시 로그인하여 탈퇴를 진행해주세요."
        );
      } else {
        Alert.alert("오류", "탈퇴 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
      }
    }
  };

  // 나머지 helper 함수들
  const getDaysSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
    return '1년 이상 전';
  };

  const getPhq9Color = (score: number) => {
    if (score >= 20) return '#EF5350';
    if (score >= 15) return '#FF7043';
    if (score >= 10) return '#FFA726';
    if (score >= 5) return '#66BB6A';
    return '#4CAF50';
  };

  const getKmsiColor = (percentage: number) => {
    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 60) return '#66BB6A';
    if (percentage >= 40) return '#FFA726';
    if (percentage >= 20) return '#FF7043';
    return '#EF5350';
  };

  const getQuickMoodAnalysis = () => {
    if (recentEmotionData.length === 0) return { averageMood: 0, trend: 'stable', status: '기록 없음' };
    
    const getEmotionScore = (emotions: string[]) => {
      if (emotions.length === 0) return 3;
      
      const emotionScores: { [key: string]: number } = {
        'joy': 5, 'sadness': 1, 'anger': 2, 'fear': 2, 'surprise': 4, 'disgust': 1
      };
      
      const totalScore = emotions.reduce((sum, emotion) => {
        return sum + (emotionScores[emotion] || 3);
      }, 0);
      
      return totalScore / emotions.length;
    };
    
    const averageMood = recentEmotionData.reduce((sum, entry) => 
      sum + getEmotionScore(entry.emotions), 0) / recentEmotionData.length;
    
    const recent = recentEmotionData.slice(-3);
    const earlier = recentEmotionData.slice(0, -3);
    
    const recentAvg = recent.reduce((sum, entry) => sum + getEmotionScore(entry.emotions), 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, entry) => sum + getEmotionScore(entry.emotions), 0) / earlier.length : recentAvg;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentAvg > earlierAvg + 0.3) trend = 'up';
    else if (recentAvg < earlierAvg - 0.3) trend = 'down';
    
    const getMoodStatus = (avg: number) => {
      if (avg >= 4.5) return '매우 좋음';
      if (avg >= 3.5) return '좋음';
      if (avg >= 2.5) return '보통';
      if (avg >= 1.5) return '힘듦';
      return '매우 힘듦';
    };
    
    return { 
      averageMood, 
      trend, 
      status: getMoodStatus(averageMood),
      needsAttention: averageMood < 2.5 && recentEmotionData.length >= 5
    };
  };

  const getEmotionEmoji = (emotions: string[]) => {
    if (emotions.length === 0) return '😐';
    
    const emotionEmojis: { [key: string]: string } = {
      'joy': '😊', 'sadness': '😢', 'anger': '😡', 
      'fear': '😰', 'surprise': '😲', 'disgust': '🤢'
    };
    const firstEmotion = emotions[0];
    if (firstEmotion === undefined) return '😐';
    return emotionEmojis[firstEmotion] || '😐';
  };

  const getEmotionColor = (emotions: string[]) => {
    if (emotions.length === 0) return '#9E9E9E';
    
    const colorMap: { [key: string]: string } = {
      'joy': '#4CAF50', 'sadness': '#2196F3', 'anger': '#F44336',
      'fear': '#FF6B6B', 'surprise': '#FF9800', 'disgust': '#9C27B0'
    };
    const firstEmotion = emotions[0];
    if (firstEmotion === undefined) return '#9E9E9E';
    return colorMap[firstEmotion] || '#9E9E9E';
  };

  const getAttachmentKoreanLabel = (code?: string) => {
    if (!code) return '알 수 없음';
    const normalized = code.toLowerCase();
    const map: { [key: string]: string } = {
      'secure': '안정형',
      'avoidant': '회피형',
      'anxious': '불안형',
      'anmxious': '불안형',
      'fearful': '두려움형',
    };
    return map[normalized] || code;
  };

  const renderQuickChart = () => {
    const analysis = getQuickMoodAnalysis();

    if (recentEmotionData.length === 0) {
      return (
        <View style={styles.noQuickDataContainer}>
          <DefaultText style={styles.noQuickDataText}>최근 AI 리포트가 없습니다</DefaultText>
          <TouchableOpacity
            onPress={() => {
              const today = new Date();
              const y = today.getFullYear();
              const m = String(today.getMonth() + 1).padStart(2, '0');
              const d = String(today.getDate()).padStart(2, '0');
              router.push(`/diary/${y}-${m}-${d}` as any);
            }}
          >
            <DefaultText style={styles.noQuickDataSubtext}>다이어리를 7일간 모아서 AI에게 레포트를 받아보세요</DefaultText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.quickAnalysisContainer}>
        <View style={styles.moodSummary}>
          <View style={styles.moodScoreContainer}>
            <DefaultText style={styles.moodScore}>{analysis.averageMood.toFixed(1)}</DefaultText>
            <DefaultText style={styles.moodStatus}>{analysis.status}</DefaultText>
          </View>
          <View style={styles.trendContainer}>
            {analysis.trend === 'up' && <TrendUpIcon />}
            {analysis.trend === 'down' && <TrendDownIcon />}
            <DefaultText style={[
              styles.trendText,
              analysis.trend === 'up' && styles.trendUp,
              analysis.trend === 'down' && styles.trendDown
            ]}>
              {analysis.trend === 'up' && '좋아지고 있어요'}
              {analysis.trend === 'down' && '힘든 시간이네요'}
              {analysis.trend === 'stable' && '안정적이에요'}
            </DefaultText>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickChart}>
          {recentEmotionData.map((entry, index) => {
            const getEmotionScore = (emotions: string[]) => {
              if (emotions.length === 0) return 3;
              const emotionScores: { [key: string]: number } = {
                'joy': 5, 'sadness': 1, 'anger': 2, 'fear': 2, 'surprise': 4, 'disgust': 1
              };
              const totalScore = emotions.reduce((sum, emotion) => {
                return sum + (emotionScores[emotion] || 3);
              }, 0);
              return totalScore / emotions.length;
            };
            
            const moodScore = getEmotionScore(entry.emotions);
            
            return (
              <View key={index} style={styles.quickEmotionItem}>
                <View style={styles.quickEmotionBar}>
                  <View 
                    style={[
                      styles.quickEmotionBarFill, 
                      { 
                        height: `${(moodScore / 5) * 100}%`,
                        backgroundColor: getEmotionColor(entry.emotions)
                      }
                    ]} 
                  />
                </View>
                <DefaultText style={styles.quickEmotionEmoji}>{getEmotionEmoji(entry.emotions)}</DefaultText>
              </View>
            );
          })}
        </ScrollView>

        {analysis.needsAttention && (
          <View style={styles.quickAlert}>
            <AlertIcon />
            <DefaultText style={styles.quickAlertText}>
              최근 기분이 많이 힘드시네요. 상세 분석을 확인해보세요.
            </DefaultText>
          </View>
        )}

        <TouchableOpacity 
          style={styles.detailAnalysisButton}
          onPress={() => router.push('/reports' as any)}
        >
          <AnalyticsIcon />
          <DefaultText style={styles.detailAnalysisButtonText}>상세 분석 보기</DefaultText>
          <Ionicons name="arrow-forward" size={16} color="#C7A488" />
        </TouchableOpacity>
      </View>
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "안녕히 가세요",
      "정말 로그아웃하시겠어요?\n언제든 다시 돌아와 주세요",
      [
        { text: "머물기", style: "cancel" },
        { 
          text: "로그아웃", 
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/')
            } catch (error) {
              Alert.alert("앗, 문제가 생겼어요", "잠시 후 다시 시도해주세요");
            }
          }
        }
      ]
    );
  };

  const getSpouseStatusText = (status: string) => {
    switch (status) {
      case 'connected': return '함께하고 있어요';
      case 'accepted': return '함께하고 있어요';
      case 'pending': return '연결 대기중';
      case 'requested': return '연결 요청 보냄';
      case 'unregistered': return '등록 대기중';
      case 'none': return '아직 혼자예요';
      default: return '아직 혼자예요';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <DefaultText style={styles.loadingText}>잠시만 기다려주세요...</DefaultText>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <DefaultText style={styles.headerTitle}>나의 공간</DefaultText>
          <DefaultText style={styles.headerSubtitle}>소중한 이야기들이 담긴 곳</DefaultText>
        </View>

        {/* 프로필 카드 */}
        <View style={styles.card}>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              {userData?.profileImage ? (
                <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.defaultProfileImage}>
                  <DefaultText style={styles.profileImageText}>
                    {userData?.displayName ? 
                      userData.displayName.length > 1 ? 
                        userData.displayName.slice(-2)
                        : userData.displayName.charAt(0) 
                      : '👤'}
                  </DefaultText>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <DefaultText style={styles.userName}>
                안녕하세요, {userData?.displayName || '익명'}님
              </DefaultText>
              <DefaultText style={styles.userEmail} numberOfLines={2} ellipsizeMode="tail">
                {userData?.email}
              </DefaultText>
              <DefaultText style={styles.joinDate}>
                {userData?.createdAt ? 
                  `${new Date(userData.createdAt).getFullYear()}년 ${new Date(userData.createdAt).getMonth() + 1}월부터 함께` 
                  : '함께한 시간을 기록하고 있어요'}
              </DefaultText>
            </View>
          </View>
        </View>

        {/* 나의 심리 프로필 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="clipboard" size={20} color="#198ae6" />
            <DefaultText style={styles.cardTitle}>나의 심리 프로필</DefaultText>
          </View>
          
          <View style={styles.assessmentSection}>
            {/* 완료한 검사 표시 */}
            <View style={styles.completedAssessments}>
              {userData?.assessmentsCompleted?.phq9 && userData?.phq9 && (
                <View style={styles.assessmentItem}>
                  <View style={styles.assessmentHeader}>
                    <CheckCircleIcon />
                    <DefaultText style={styles.assessmentName}>PHQ-9 (우울)</DefaultText>
                    <DefaultText style={styles.assessmentDate}>
                      {getDaysSince(userData.phq9.completedAt)}
                    </DefaultText>
                  </View>
                  <View style={styles.assessmentResult}>
                    <View style={[styles.assessmentScore, { backgroundColor: getPhq9Color(userData.phq9.totalScore) + '20' }]}>
                      <DefaultText style={[styles.assessmentScoreText, { color: getPhq9Color(userData.phq9.totalScore) }]}>
                        {userData.phq9.totalScore}점
                      </DefaultText>
                      <DefaultText style={[styles.assessmentLevel, { color: getPhq9Color(userData.phq9.totalScore) }]}>
                        {userData.phq9.interpretation}
                      </DefaultText>
                    </View>
                    {userData.phq9.totalScore >= 10 && (
                      <TouchableOpacity 
                        style={styles.consultButton}
                        onPress={() => Alert.alert('상담 안내', '정신건강 상담전화: 1577-0199')}
                      >
                        <DefaultText style={styles.consultButtonText}>상담 연결</DefaultText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {userData?.assessmentsCompleted?.kmsi && userData?.kmsi && (
                <View style={styles.assessmentItem}>
                  <View style={styles.assessmentHeader}>
                    <CheckCircleIcon />
                    <DefaultText style={styles.assessmentName}>K-MSI (관계만족도)</DefaultText>
                    <DefaultText style={styles.assessmentDate}>
                      {getDaysSince(userData.kmsi.completedAt)}
                    </DefaultText>
                  </View>
                  <View style={styles.assessmentResult}>
                    <View style={[styles.assessmentScore, { backgroundColor: getKmsiColor(userData.kmsi.percentage) + '20' }]}>
                      <DefaultText style={[styles.assessmentScoreText, { color: getKmsiColor(userData.kmsi.percentage) }]}>
                        {userData.kmsi.percentage}%
                      </DefaultText>
                      <DefaultText style={[styles.assessmentLevel, { color: getKmsiColor(userData.kmsi.percentage) }]}>
                        {userData.kmsi.interpretation}
                      </DefaultText>
                    </View>
                    {new Date(userData.kmsi.completedAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && (
                      <TouchableOpacity 
                        style={styles.retakeButton}
                        onPress={() => router.push('/assessment/kmsi' as any)}
                      >
                        <DefaultText style={styles.retakeButtonText}>재검사</DefaultText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* 추가 가능한 검사 */}
            <View style={styles.availableAssessments}>
              <DefaultText style={styles.availableTitle}>추가 검사</DefaultText>
              
              {!userData?.assessmentsCompleted?.gad7 && (
                <TouchableOpacity 
                  style={styles.availableItem}
                  onPress={() => router.push('/assessment/kmsi' as any)}
                >
                  <AddCircleIcon />
                  <View style={styles.availableInfo}>
                    <DefaultText style={styles.availableName}>불안도 검사 (GAD-7)</DefaultText>
                    <DefaultText style={styles.availableDesc}>7문항 • 약 3분</DefaultText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8A94A6" />
                </TouchableOpacity>
              )}

              {!userData?.assessmentsCompleted?.dass21 && (
                <TouchableOpacity 
                  style={styles.availableItem}
                  onPress={() => router.push('/assessment/kmsi' as any)}
                >
                  <AddCircleIcon />
                  <View style={styles.availableInfo}>
                    <DefaultText style={styles.availableName}>스트레스 검사 (DASS-21)</DefaultText>
                    <DefaultText style={styles.availableDesc}>21문항 • 약 10분</DefaultText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8A94A6" />
                </TouchableOpacity>
              )}

              {userData?.spouseStatus === 'connected' && (
                <TouchableOpacity 
                  style={styles.availableItem}
                  onPress={() => router.push('/assessment/kmsi' as any)}
                >
                  <TimeIcon />
                  <View style={styles.availableInfo}>
                    <DefaultText style={styles.availableName}>관계 만족도 재검사</DefaultText>
                    <DefaultText style={styles.availableDesc}>정기적인 체크가 도움이 됩니다</DefaultText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8A94A6" />
                </TouchableOpacity>
              )}
            </View>

            {/* 검사 안내 */}
            <View style={styles.assessmentNotice}>
              <Ionicons name="information-circle-outline" size={16} color="#8A94A6" />
              <DefaultText style={styles.assessmentNoticeText}>
                모든 검사는 선별 목적이며, 정확한 진단은 전문가 상담이 필요합니다
              </DefaultText>
            </View>
          </View>
        </View>

        {/* 최근 감정 분석 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <StatsIcon />
            <DefaultText style={styles.cardTitle}>최근 7일 감정 분석</DefaultText>
          </View>
          {renderQuickChart()}
        </View>

        {/* Sternberg 결과 카드 */}
        {userData?.sternbergType && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BrainIcon />
              <DefaultText style={styles.cardTitle}>나의 성향</DefaultText>
            </View>
            <View style={styles.personalityCard}>
              <DefaultText style={styles.personalityTitle}>
                {userData.sternbergProfile?.name || '사랑 유형 결과'}
              </DefaultText>
              <DefaultText style={styles.personalityDesc}>
                {userData.sternbergProfile?.description || 'Sternberg 3요소 기반 분석'}
              </DefaultText>
              {userData.sternbergProfile && (
                <View style={{ width: '100%', marginTop: 8, gap: 8 }}>
                  {[
                    { label: '친밀감', value: Math.round(userData.sternbergProfile.intimacy || 0) },
                    { label: '열정', value: Math.round(userData.sternbergProfile.passion || 0) },
                    { label: '헌신', value: Math.round(userData.sternbergProfile.commitment || 0) },
                  ].map((bar, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <DefaultText style={{ width: 56, fontSize: 13, color: '#637788' }}>{bar.label}</DefaultText>
                      <View style={{ flex: 1, height: 8, backgroundColor: '#F0F2F4', borderRadius: 6, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${bar.value}%`, backgroundColor: '#198ae6' }} />
                      </View>
                      <DefaultText style={{ width: 36, fontSize: 12, color: '#637788', textAlign: 'right' }}>{bar.value}%</DefaultText>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity 
                onPress={() => router.push('/onboarding/psychology-test' as any)}
              >
                <DefaultText style={styles.linkLike}>다시 테스트하기</DefaultText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 애착유형 카드 */}
        {userData?.attachmentType && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <HeartIcon />
              <DefaultText style={styles.cardTitle}>애착 유형</DefaultText>
            </View>
            <View style={styles.attachmentCard}>
              <DefaultText style={styles.attachmentType}>
                {getAttachmentKoreanLabel(userData.attachmentType)}
              </DefaultText>
              <DefaultText style={styles.attachmentDesc}>
                {attachmentInfo?.description || '당신의 관계 패턴을 알아보세요'}
              </DefaultText>
              <TouchableOpacity 
                onPress={() => router.push('/onboarding/attachment-test' as any)}
              >
                <DefaultText style={styles.linkLike}>다시 테스트하기</DefaultText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 배우자 연결 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinkIcon />
            <DefaultText style={styles.cardTitle}>배우자 연결</DefaultText>
            {pendingRequests > 0 && (
              <View style={styles.badge}>
                <DefaultText style={styles.badgeText}>{pendingRequests}</DefaultText>
              </View>
            )}
          </View>
          <View style={styles.spouseSection}>
            <DefaultText style={styles.spouseStatus}>
              {getSpouseStatusText(userData?.spouseStatus || 'none')}
            </DefaultText>
            {spouseProfile && (
              <View style={styles.spouseProfileRow}>
                {spouseProfile.profileImage ? (
                  <Image source={{ uri: spouseProfile.profileImage }} style={styles.spouseAvatar} />
                ) : (
                  <View style={styles.spouseAvatarFallback}>
                    <DefaultText style={styles.spouseAvatarText}>
                      {spouseProfile.displayName ? spouseProfile.displayName.charAt(0) : '👤'}
                    </DefaultText>
                  </View>
                )}
                <DefaultText style={styles.spouseName}>
                  {spouseProfile.displayName || '배우자'}
                </DefaultText>
              </View>
            )}
            <View style={styles.spouseActions}>
              {userData?.spouseStatus === 'none' && (
                <TouchableOpacity 
                  style={styles.connectButton}
                  onPress={() => router.push('/spouse-connect' as any)}
                >
                  <DefaultText style={styles.connectButtonText}>배우자 연결하기</DefaultText>
                </TouchableOpacity>
              )}
              {pendingRequests > 0 && (
                <TouchableOpacity 
                  style={styles.pendingButton}
                  onPress={() => router.push('/spouse-requests' as any)}
                >
                  <DefaultText style={styles.pendingButtonText}>연결 요청 확인</DefaultText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* 기록 통계 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ReportIcon />
            <DefaultText style={styles.cardTitle}>나의 기록</DefaultText>
          </View>
          <View style={styles.statsGrid}>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/profile-diaries', params: { filter: 'all' } } as any)}>
              <DefaultText style={styles.statNumber}>{diaryStats.total}</DefaultText>
              <DefaultText style={styles.statLabel}>전체 일기</DefaultText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/profile-diaries', params: { filter: 'month' } } as any)}>
              <DefaultText style={styles.statNumber}>{diaryStats.thisMonth}</DefaultText>
              <DefaultText style={styles.statLabel}>이번 달</DefaultText>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <DefaultText style={styles.statNumber}>{diaryStats.consecutiveDays}</DefaultText>
              <DefaultText style={styles.statLabel}>연속 일수</DefaultText>
            </View>
          </View>
        </View>

        {/* 설정 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SettingsIcon />
            <DefaultText style={styles.cardTitle}>설정</DefaultText>
          </View>
          
          {/* 개인정보 관리 */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('준비중', '개인정보 수정 기능을 준비중이에요.')}
          >
            <Ionicons name="person-circle" size={24} color="#8A94A6" />
            <View style={styles.settingInfo}>
              <DefaultText style={styles.settingTitle}>개인정보 관리</DefaultText>
              <DefaultText style={styles.settingDesc}>닉네임, 프로필 사진 변경</DefaultText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A94A6" />
          </TouchableOpacity>

          {/* 알림 설정 */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('준비중', '알림 설정 기능을 준비중이에요.')}
          >
            <Ionicons name="notifications" size={24} color="#8A94A6" />
            <View style={styles.settingInfo}>
              <DefaultText style={styles.settingTitle}>알림 설정</DefaultText>
              <DefaultText style={styles.settingDesc}>일기 리마인더, 배우자 알림</DefaultText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A94A6" />
          </TouchableOpacity>

          {/* 고객지원 */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('고객지원', '토닥토닥 팀\n이메일: support@todaktodak.com\n카카오톡: @토닥토닥')}
          >
            <Ionicons name="help-circle" size={24} color="#8A94A6" />
            <View style={styles.settingInfo}>
              <DefaultText style={styles.settingTitle}>고객지원</DefaultText>
              <DefaultText style={styles.settingDesc}>문의하기, 자주 묻는 질문</DefaultText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A94A6" />
          </TouchableOpacity>

          {/* 앱 정보 */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('앱 정보', '토닥토닥 v1.0.0\n\n개인정보처리방침\n이용약관\n\n© 2024 토닥토닥 팀')}
          >
            <Ionicons name="information-circle" size={24} color="#8A94A6" />
            <View style={styles.settingInfo}>
              <DefaultText style={styles.settingTitle}>앱 정보</DefaultText>
              <DefaultText style={styles.settingDesc}>버전, 개인정보처리방침</DefaultText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A94A6" />
          </TouchableOpacity>
        </View>

        {/* 하단 최소 링크 */}
        <View style={styles.footerActions}>
          <TouchableOpacity onPress={handleLogout}>
            <DefaultText style={styles.footerLink}>로그아웃</DefaultText>
          </TouchableOpacity>
          <DefaultText style={styles.footerDot}>·</DefaultText>
          <TouchableOpacity onPress={handleDeleteAccount}>
            <DefaultText style={styles.footerLinkDanger}>회원탈퇴</DefaultText>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingText: {
    color: '#637788',
    textAlign: 'center' as 'center',
    fontSize: 16,
    fontWeight: '400',
  },
  header: {
    paddingTop: 70,
    paddingBottom: 32,
    paddingHorizontal: 28,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111518',
    textAlign: 'center' as 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#637788',
    textAlign: 'center' as 'center',
    fontWeight: '400',
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#dce1e5',
  },
  cardHeader: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111518',
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  profileSection: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
  },
  profileImageContainer: {
    marginRight: 20,
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  defaultProfileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f0f2f4',
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
  },
  profileImageText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#637788',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111518',
    marginBottom: 6,
    lineHeight: 28,
  },
  userEmail: {
    fontSize: 12,
    color: '#637788',
    marginBottom: 4,
    fontWeight: '400',
    lineHeight: 16,
  },
  joinDate: {
    fontSize: 13,
    color: '#637788',
    fontWeight: '400',
    lineHeight: 18,
  },
  assessmentSection: {
    gap: 20,
  },
  completedAssessments: {
    gap: 16,
  },
  assessmentItem: {
    backgroundColor: '#F9F6F3',
    borderRadius: 12,
    padding: 16,
  },
  assessmentHeader: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    marginBottom: 12,
    gap: 8,
  },
  assessmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111518',
    flex: 1,
  },
  assessmentDate: {
    fontSize: 12,
    color: '#8A94A6',
  },
  assessmentResult: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    justifyContent: 'space-between' as 'space-between',
  },
  assessmentScore: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center' as 'center',
  },
  assessmentScoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  assessmentLevel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  consultButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  consultButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  retakeButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retakeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  availableAssessments: {
    gap: 12,
  },
  availableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A94A6',
    marginBottom: 8,
  },
  availableItem: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECEF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  availableInfo: {
    flex: 1,
  },
  availableName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111518',
    marginBottom: 4,
  },
  availableDesc: {
    fontSize: 12,
    color: '#8A94A6',
  },
  assessmentNotice: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  assessmentNoticeText: {
    fontSize: 12,
    color: '#8A94A6',
    flex: 1,
    lineHeight: 18,
  },
  quickAnalysisContainer: {
    gap: 16,
  },
  noQuickDataContainer: {
    height: 80,
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
  },
  noQuickDataText: {
    fontSize: 15,
    color: '#637788',
    textAlign: 'center' as 'center',
    marginBottom: 4,
  },
  noQuickDataSubtext: {
    fontSize: 13,
    color: '#5B9BD5',
    textAlign: 'center' as 'center',
  },
  moodSummary: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-between' as 'space-between',
    alignItems: 'center' as 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
  },
  moodScoreContainer: {
    alignItems: 'center' as 'center',
  },
  moodScore: {
    fontSize: 24,
    fontWeight: '700',
    color: '#198ae6',
  },
  moodStatus: {
    fontSize: 13,
    color: '#8A817C',
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
  },
  trendText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  trendUp: {
    color: '#4CAF50',
  },
  trendDown: {
    color: '#FF6B6B',
  },
  quickChart: {
    height: 80,
    paddingVertical: 8,
  },
  quickEmotionItem: {
    alignItems: 'center' as 'center',
    marginRight: 16,
    width: 32,
  },
  quickEmotionBar: {
    width: 6,
    height: 40,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    justifyContent: 'flex-end' as 'flex-end',
    marginBottom: 6,
  },
  quickEmotionBarFill: {
    width: '100%',
    borderRadius: 3,
  },
  quickEmotionEmoji: {
    fontSize: 14,
  },
  quickAlert: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    backgroundColor: '#FFF3F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  quickAlertText: {
    fontSize: 13,
    color: '#8B0000',
    marginLeft: 8,
    flex: 1,
  },
  detailAnalysisButton: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    justifyContent: 'center' as 'center',
    backgroundColor: '#F8FAFF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EDF7',
    gap: 8,
  },
  detailAnalysisButtonText: {
    color: '#198ae6',
    fontSize: 15,
    fontWeight: '600',
  },
  personalityCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center' as 'center',
  },
  personalityTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111518',
  },
  personalityDesc: {
    fontSize: 14,
    color: '#637788',
    textAlign: 'center' as 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  attachmentCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center' as 'center',
  },
  attachmentType: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111518',
    marginBottom: 8,
  },
  attachmentDesc: {
    fontSize: 14,
    color: '#637788',
    textAlign: 'center' as 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  linkLike: {
    color: '#8A94A6',
    fontSize: 13,
    textDecorationLine: 'underline' as 'underline',
    textAlign: 'center' as 'center',
  },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  spouseSection: {
    gap: 16,
  },
  spouseStatus: {
    fontSize: 16,
    color: '#111518',
    fontWeight: '500',
  },
  spouseActions: {
    gap: 12,
  },
  spouseProfileRow: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    gap: 10,
    marginTop: 8,
  },
  spouseAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  spouseAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F5FA',
    alignItems: 'center' as 'center',
    justifyContent: 'center' as 'center',
  },
  spouseAvatarText: {
    fontSize: 12,
    color: '#1F5FA8',
    fontWeight: '700',
  },
  spouseName: {
    fontSize: 14,
    color: '#111518',
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#198ae6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingButton: {
    backgroundColor: '#FFA726',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as 'center',
  },
  pendingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-around' as 'space-around',
  },
  statItem: {
    alignItems: 'center' as 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#198ae6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8A94A6',
  },
  settingItem: {
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111518',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
    color: '#8A94A6',
  },
  footerActions: {
    paddingVertical: 16,
    alignItems: 'center' as 'center',
    flexDirection: 'row' as 'row',
    justifyContent: 'center' as 'center',
    gap: 10,
  },
  footerLink: {
    fontSize: 12,
    color: '#8A94A6',
    textDecorationLine: 'underline' as 'underline',
  },
  footerLinkDanger: {
    fontSize: 12,
    color: '#8A94A6',
    textDecorationLine: 'underline' as 'underline',
  },
  footerDot: {
    fontSize: 12,
    color: '#C0C6CE',
  },
  
  // 모달 스타일
  modalOverlay: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
    zIndex: 1000,
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
    flexDirection: 'row' as 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as 'center',
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