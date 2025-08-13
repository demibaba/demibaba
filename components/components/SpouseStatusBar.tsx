// app/components/SpouseStatusBar.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import DefaultText from './DefaultText';
import { useRouter } from 'expo-router';

interface SpouseStatusBarProps {
  onPress?: () => void;
}

const SpouseStatusBar: React.FC<SpouseStatusBarProps> = ({ onPress }) => {
  console.log("🔍 SpouseStatusBar 컴포넌트 시작");
  
  const router = useRouter();
  const [spouseStatus, setSpouseStatus] = useState<string | null>(null);
  const [spouseName, setSpouseName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔍 SpouseStatusBar useEffect 실행");
    const checkSpouseStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("🔍 사용자 없음");
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          console.log("🔍 사용자 문서 없음");
          return;
        }

        const userData = userDoc.data();
        const status = userData.spouseStatus || 'none';
        console.log("🔍 배우자 상태:", status);
        setSpouseStatus(status);

        // 배우자 정보 가져오기
        if (userData.spouseId && userData.spouseStatus === 'accepted') {
          const spouseDoc = await getDoc(doc(db, 'users', userData.spouseId));
          if (spouseDoc.exists()) {
            setSpouseName(spouseDoc.data().displayName || '배우자');
          }
        }
      } catch (error) {
        console.error('배우자 상태 확인 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSpouseStatus();
  }, []);

  if (loading || !spouseStatus) {
    console.log("🔍 SpouseStatusBar 렌더링 안함 - loading:", loading, "spouseStatus:", spouseStatus);
    return null;
  }

  console.log("🔍 SpouseStatusBar 렌더링 조건 통과 - 상태:", spouseStatus);

  // 상태에 따른 메시지와 스타일 결정
  let message = '';
  let backgroundColor = '#f0f0f0';
  let textColor = '#333';

  // if-else 구문으로 변경하여 타입 오류 방지
  if (spouseStatus === 'accepted') {
    message = `${spouseName || '배우자'}님과 함께 사용 중입니다`;
    backgroundColor = '#fff'; // 연한 녹색
    textColor = '#000'; // 검은색
  } else if (spouseStatus === 'requested') {
    message = '부부 등록 요청을 보냈습니다';
    backgroundColor = '#fff9c4'; // 연한 노랑
    textColor = '#f57f17'; // 주황색
  } else if (spouseStatus === 'pending') {
    message = '부부 등록 요청이 도착했습니다';
    backgroundColor = '#ffebee'; // 연한 빨강
    textColor = '#c62828'; // 진한 빨강
  } else if (spouseStatus === 'unregistered') {
    message = '초대한 배우자가 아직 가입하지 않았습니다';
    backgroundColor = '#f5f5f5';
    textColor = '#757575';
  } else {
    // none인 경우 또는 기타 상태
    return null; // 상태가 없으면 표시하지 않음
  }

  const handlePress = () => {
    console.log("SpouseStatusBar 클릭됨!");
    console.log("현재 상태:", spouseStatus);
    
    if (onPress) {
      console.log("onPress 콜백 실행");
      onPress();
    } else if ((spouseStatus as string) === 'pending') {
      console.log("spouse-requests로 이동 시도");
      router.push('/screens/spouse-requests');
    } else if ((spouseStatus as string) === 'none') {
      console.log("spouse-registration으로 이동 시도");
      router.push('/spouse-registration');
    }
  };

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor }]} onPress={handlePress}>
      <DefaultText style={[styles.text, { color: textColor }]}>{message}</DefaultText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  text: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default SpouseStatusBar;