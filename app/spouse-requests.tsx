// app/spouse-requests.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import DefaultText from '../components/DefaultText';

// SpouseStatus 열거형 직접 정의
enum SpouseStatus {
  NONE = 'none',
  UNREGISTERED = 'unregistered',
  REQUESTED = 'requested',
  PENDING = 'pending',
  ACCEPTED = 'accepted'
}

export default function SpouseRequestsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [spouseRequests, setSpouseRequests] = useState<any[]>([]);
  const [spouseStatus, setSpouseStatus] = useState<string | null>(null);
  const [spouseName, setSpouseName] = useState<string | null>(null);
  
  // ✅ 새로 추가: 피드백 상태
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    checkSpouseStatus();
  }, []);

  // ✅ 성공 메시지 표시 함수
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    
    // 3초 후 메시지 자동 사라짐
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
    }, 3000);
  };

  const checkSpouseStatus = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // 사용자 문서 가져오기
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      setSpouseStatus(userData.spouseStatus || 'none');
      
      // 배우자가 이미 승인된 상태인 경우 배우자 정보 가져오기
      if (userData.spouseStatus === 'accepted' && userData.spouseId) {
        const spouseDoc = await getDoc(doc(db, 'users', userData.spouseId));
        if (spouseDoc.exists()) {
          setSpouseName(spouseDoc.data().displayName || spouseDoc.data().email);
        }
        setLoading(false);
        return;
      }
      
      // 배우자 등록 요청이 대기 중인 경우만 요청 목록 조회
      if (userData.spouseStatus === 'pending') {
        const requestsRef = collection(db, 'spouseRequests');
        const q = query(
          requestsRef, 
          where('recipientId', '==', user.uid),
          where('status', '==', 'pending')
        );
        
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setSpouseRequests(requests);
      }
    } catch (error) {
      console.error('배우자 상태 확인 오류:', error);
      // ✅ 에러 시에도 사용자에게 알림
      Alert.alert('오류', '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      
      const user = auth.currentUser;
      if (!user) return;

      // 요청 문서 가져오기
      const requestRef = doc(db, 'spouseRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        Alert.alert('오류', '요청을 찾을 수 없습니다.');
        return;
      }

      const requestData = requestDoc.data();
      const requesterId = requestData.requesterId;
      const recipientId = requestData.recipientId;

      // 배치 업데이트로 트랜잭션 처리
      const batch = writeBatch(db);
      
      // 요청 상태를 'accepted'로 변경
      batch.update(requestRef, { 
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      });

      // 요청자와 수신자의 배우자 상태를 'accepted'로 변경
      batch.update(doc(db, 'users', requesterId), { 
        spouseStatus: 'accepted',
        spouseId: recipientId,
        spouseConnectedAt: new Date().toISOString()
      });
      
      batch.update(doc(db, 'users', recipientId), { 
        spouseStatus: 'accepted',
        spouseId: requesterId,
        spouseConnectedAt: new Date().toISOString()
      });

      // 배치 커밋
      await batch.commit();

      // 성공 메시지 표시
      showSuccessMessage('배우자 연결이 완료되었습니다!');
      
      // 상태 업데이트
      setSpouseStatus('accepted');
      setSpouseRequests([]);
      
      // 2초 후 캘린더로 이동
      setTimeout(() => {
        router.push('/calendar');
      }, 2000);

    } catch (error) {
      console.error('요청 수락 오류:', error);
      Alert.alert('오류', '요청을 수락하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      
      const user = auth.currentUser;
      if (!user) return;

      // 요청 문서 가져오기
      const requestRef = doc(db, 'spouseRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        Alert.alert('오류', '요청을 찾을 수 없습니다.');
        return;
      }

      const requestData = requestDoc.data();
      const requesterId = requestData.requesterId;
      const recipientId = requestData.recipientId;

      // 배치 업데이트로 트랜잭션 처리
      const batch = writeBatch(db);
      
      // 요청 상태를 'rejected'로 변경
      batch.update(requestRef, { 
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });

      // 요청자와 수신자의 배우자 상태를 'none'으로 변경
      batch.update(doc(db, 'users', requesterId), { 
        spouseStatus: 'none',
        spouseId: null
      });
      
      batch.update(doc(db, 'users', recipientId), { 
        spouseStatus: 'none',
        spouseId: null
      });

      // 배치 커밋
      await batch.commit();

      // 성공 메시지 표시
      showSuccessMessage('요청이 거절되었습니다.');
      
      // 상태 업데이트
      setSpouseStatus('none');
      setSpouseRequests([]);

    } catch (error) {
      console.error('요청 거절 오류:', error);
      Alert.alert('오류', '요청을 거절하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const goToCalendar = () => {
    router.push('/calendar');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C7A488" />
        <DefaultText style={styles.loadingText}>로딩 중...</DefaultText>
      </View>
    );
  }

  // 배우자가 이미 연결된 경우
  if (spouseStatus === 'accepted') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goToCalendar} style={styles.backButton}>
            <DefaultText style={styles.backButtonText}>← 돌아가기</DefaultText>
          </TouchableOpacity>
          <DefaultText style={styles.headerTitle}>배우자 연결 완료</DefaultText>
        </View>
        
        <View style={styles.successContainer}>
          <DefaultText style={styles.successTitle}>🎉 연결 완료!</DefaultText>
          <DefaultText style={styles.successSubtitle}>
            {spouseName}님과 연결되었습니다.
          </DefaultText>
          <DefaultText style={styles.successDescription}>
            이제 함께 감정 다이어리를 작성하고 공유할 수 있습니다.
          </DefaultText>
          
          <TouchableOpacity style={styles.calendarButton} onPress={goToCalendar}>
            <DefaultText style={styles.calendarButtonText}>캘린더로 이동</DefaultText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 배우자 등록 요청이 대기 중인 경우
  if (spouseStatus === 'pending' && spouseRequests.length > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goToCalendar} style={styles.backButton}>
            <DefaultText style={styles.backButtonText}>← 돌아가기</DefaultText>
          </TouchableOpacity>
          <DefaultText style={styles.headerTitle}>배우자 연결 요청</DefaultText>
        </View>
        
        <View style={styles.requestsContainer}>
          <DefaultText style={styles.requestsTitle}>
            새로운 배우자 연결 요청이 있습니다
          </DefaultText>
          <DefaultText style={styles.requestsSubtitle}>
            아래 요청을 검토하고 수락하거나 거절해주세요.
          </DefaultText>
          
          {spouseRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <DefaultText style={styles.requesterName}>
                  {request.requesterName || request.requesterEmail}
                </DefaultText>
                <DefaultText style={styles.requestDate}>
                  {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                </DefaultText>
              </View>
              
              <DefaultText style={styles.requestMessage}>
                {request.message || '배우자 연결을 요청합니다.'}
              </DefaultText>
              
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => rejectRequest(request.id)}
                  disabled={processingRequestId === request.id}
                >
                  <DefaultText style={styles.rejectButtonText}>거절</DefaultText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => acceptRequest(request.id)}
                  disabled={processingRequestId === request.id}
                >
                  <DefaultText style={styles.acceptButtonText}>수락</DefaultText>
                </TouchableOpacity>
              </View>
              
              {processingRequestId === request.id && (
                <View style={styles.processingIndicator}>
                  <ActivityIndicator size="small" color="#C7A488" />
                  <DefaultText style={styles.processingText}>처리 중...</DefaultText>
                </View>
              )}
            </View>
          ))}
        </View>
        
        {/* 성공 메시지 */}
        {showSuccess && (
          <View style={styles.successMessage}>
            <DefaultText style={styles.successMessageText}>{successMessage}</DefaultText>
          </View>
        )}
      </View>
    );
  }

  // 요청이 없는 경우
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToCalendar} style={styles.backButton}>
          <DefaultText style={styles.backButtonText}>← 돌아가기</DefaultText>
        </TouchableOpacity>
        <DefaultText style={styles.headerTitle}>배우자 연결 요청</DefaultText>
      </View>
      
      <View style={styles.noRequestsContainer}>
        <DefaultText style={styles.noRequestsTitle}>요청이 없습니다</DefaultText>
        <DefaultText style={styles.noRequestsSubtitle}>
          현재 대기 중인 배우자 연결 요청이 없습니다.
        </DefaultText>
        
        <TouchableOpacity style={styles.calendarButton} onPress={goToCalendar}>
          <DefaultText style={styles.calendarButtonText}>캘린더로 이동</DefaultText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF7',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFBF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8A817C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFBF7',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#C7A488',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4E37',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  successSubtitle: {
    fontSize: 18,
    color: '#5D4E37',
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 16,
    color: '#8A817C',
    textAlign: 'center',
    marginBottom: 32,
  },
  calendarButton: {
    backgroundColor: '#C7A488',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  calendarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  requestsContainer: {
    flex: 1,
    padding: 20,
  },
  requestsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 8,
  },
  requestsSubtitle: {
    fontSize: 16,
    color: '#8A817C',
    marginBottom: 24,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requesterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4E37',
  },
  requestDate: {
    fontSize: 14,
    color: '#8A817C',
  },
  requestMessage: {
    fontSize: 16,
    color: '#5D4E37',
    marginBottom: 20,
    lineHeight: 24,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8A817C',
  },
  successMessage: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  successMessageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noRequestsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noRequestsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 12,
  },
  noRequestsSubtitle: {
    fontSize: 16,
    color: '#8A817C',
    textAlign: 'center',
    marginBottom: 32,
  },
});
