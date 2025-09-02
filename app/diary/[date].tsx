import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import DefaultText from '../../components/DefaultText';
import { Ionicons } from '@expo/vector-icons';

export default function DiaryByDatePage() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiary = async () => {
      try {
        if (!auth.currentUser || !date) return;
        const paddedDate = String(date)
          .replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (_m, y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        const ref = doc(db, 'diaries', `${auth.currentUser.uid}_${paddedDate}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data: any = snap.data();
          setText(data.text || '');
        }
      } catch (e) {
        console.error('다이어리 불러오기 실패:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDiary();
  }, [date]);

  const handleSave = async () => {
    try {
      if (!auth.currentUser || !date) return;
      const paddedDate = String(date)
        .replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (_m, y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      const ref = doc(db, 'diaries', `${auth.currentUser.uid}_${paddedDate}`);
      await setDoc(ref, {
        userId: auth.currentUser.uid,
        date: paddedDate,
        text,
        updatedAt: new Date(),
      }, { merge: true });
      Alert.alert('저장 완료', '일기가 저장되었습니다.');
      router.back();
    } catch (e) {
      console.error('다이어리 저장 실패:', e);
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <DefaultText style={styles.loadingText}>불러오는 중...</DefaultText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#3B3029" />
        </TouchableOpacity>
        <DefaultText style={styles.headerTitle}>{date}</DefaultText>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
          <Ionicons name="save" size={20} color="#198ae6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.input}
          placeholder="오늘의 기록을 남겨보세요"
          placeholderTextColor="#B0A79F"
          multiline
          value={text}
          onChangeText={setText}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#637788',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE4',
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B3029',
  },
  scrollContent: {
    padding: 16,
  },
  input: {
    minHeight: 280,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E1DB',
    padding: 16,
    fontSize: 16,
    color: '#111518',
    textAlignVertical: 'top',
  },
});


