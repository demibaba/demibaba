import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../config/firebaseConfig';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import DefaultText from '../components/DefaultText';

const pad2 = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const getLastNDates = (n: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    dates.push(ymd(d));
  }
  return dates;
};

const STABLE_PATTERN: string[] = ['good', 'good', 'neutral', 'great', 'good', 'neutral', 'good'];
const ANXIOUS_PATTERN: string[] = ['terrible', 'great', 'bad', 'great', 'terrible', 'good', 'bad'];

async function findUserIdByEmail(email: string): Promise<string | null> {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  // users 문서의 id가 uid라고 가정
  return snap.docs[0]?.id ?? null;
}

async function seedWeekForUser(email: string, emotions: string[]) {
  const uid = await findUserIdByEmail(email);
  if (!uid) throw new Error(`사용자 이메일을 찾을 수 없습니다: ${email}`);

  const dates = getLastNDates(7);
  const writes = dates.map((date, idx) => {
    const emotion = emotions[idx % emotions.length];
    const docId = `${uid}_${date}`;
    const data = {
      userId: uid,
      date,
      text: `[seed] ${email}의 ${date} 일기 (감정: ${emotion})`,
      emotions: [emotion],
      createdAt: new Date().toISOString(),
    } as any;
    return setDoc(doc(db, 'diaries', docId), data, { merge: true });
  });
  await Promise.all(writes);
}

export default function DevSeedScreen() {
  const [loading, setLoading] = useState(false);

  const runSeed = async () => {
    try {
      setLoading(true);
      await seedWeekForUser('111111@naver.com', STABLE_PATTERN);
      await seedWeekForUser('222222@naver.com', ANXIOUS_PATTERN);
      Alert.alert('완료', '최근 7일 테스트 데이터가 추가되었습니다.');
    } catch (e: any) {
      console.error('시드 실패:', e);
      Alert.alert('오류', e?.message || '시드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="construct" size={36} color="#4A90E2" />
        <DefaultText style={styles.title}>개발용 데이터 시드</DefaultText>
        <DefaultText style={styles.subtitle}>
          diaries 컬렉션에 최근 7일 데이터(안정형/불안형)를 추가합니다.
        </DefaultText>

        <TouchableOpacity style={styles.button} onPress={runSeed} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <DefaultText style={styles.buttonText}>시드 실행</DefaultText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFC',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    width: 360,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#637788',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});


