import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, SectionList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DefaultText from '../components/DefaultText';
import { auth, db } from '../config/firebaseConfig';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

interface DiaryDoc {
  id: string;
  date?: string;
  text?: string;
  emotions?: string[];
  createdAt?: any;
}

export default function ProfileDiaries() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialFilter = (params.filter as string) || 'all';
  const [items, setItems] = useState<DiaryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'month'>(initialFilter === 'month' ? 'month' : 'all');

  useEffect(() => {
    const load = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
        const ref = collection(db, 'diaries');
        let snap;
        try {
          const q1 = query(
            ref,
            where('userId', '==', auth.currentUser.uid),
            orderBy('date', 'desc')
          );
          snap = await getDocs(q1);
        } catch (e) {
          // 인덱스 미생성 등으로 실패 시 orderBy 없이 조회 후 정렬
          const q2 = query(
            ref,
            where('userId', '==', auth.currentUser.uid)
          );
          snap = await getDocs(q2);
        }
        const all: DiaryDoc[] = [];
        snap.forEach(doc => all.push({ id: doc.id, ...(doc.data() as any) }));

        // 클라이언트 정렬 보정
        const sorted = all.sort((a, b) => ((b.date || '') as string).localeCompare((a.date || '') as string));

        const filtered = (initialFilter === 'month')
          ? sorted.filter(d => typeof d.date === 'string' && (() => {
              const dt = new Date(d.date as string);
              const now = new Date();
              return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
            })())
          : sorted;
        setItems(filtered);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [initialFilter]);

  const displayedItems = useMemo(() => {
    const all = items;
    if (activeFilter === 'month') {
      const now = new Date();
      return all.filter(d => typeof d.date === 'string' && (() => {
        const dt = new Date(d.date as string);
        return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
      })());
    }
    return all;
  }, [items, activeFilter]);

  const sections = useMemo(() => {
    const map: { [key: string]: DiaryDoc[] } = {};
    displayedItems.forEach(d => {
      const key = (d.date && typeof d.date === 'string') ? d.date.slice(0, 7) : '기타'; // YYYY-MM
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    const keys = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return keys.map(k => ({ title: k, data: (map[k] || []).sort((a, b) => ((b.date || '') as string).localeCompare((a.date || '') as string)) }));
  }, [displayedItems]);

  const renderItem = ({ item }: { item: DiaryDoc }) => (
    <TouchableOpacity style={styles.item} onPress={() => router.push(`/diary/${item.date}` as any)}>
      <DefaultText style={styles.itemDate}>{item.date}</DefaultText>
      <DefaultText style={styles.itemText} numberOfLines={2}>{item.text || ''}</DefaultText>
      {Array.isArray(item.emotions) && item.emotions.length > 0 && (
        <View style={styles.emotionRow}>
          {item.emotions.slice(0, 4).map((e, idx) => (
            <View key={`${item.id}-emo-${idx}`} style={styles.emotionChip}>
              <DefaultText style={styles.emotionChipText}>{e}</DefaultText>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}>
      <DefaultText style={styles.sectionTitle}>{section.title}</DefaultText>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <DefaultText style={styles.headerTitle}>나의 기록</DefaultText>
        <View style={styles.segment}>
          <TouchableOpacity style={[styles.segmentBtn, activeFilter === 'all' && styles.segmentBtnActive]} onPress={() => setActiveFilter('all')}>
            <DefaultText style={[styles.segmentText, activeFilter === 'all' && styles.segmentTextActive]}>전체</DefaultText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, activeFilter === 'month' && styles.segmentBtnActive]} onPress={() => setActiveFilter('month')}>
            <DefaultText style={[styles.segmentText, activeFilter === 'month' && styles.segmentTextActive]}>이번 달</DefaultText>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <DefaultText style={styles.loading}>불러오는 중...</DefaultText>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<DefaultText style={styles.empty}>작성한 일기가 없어요</DefaultText>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111518', textAlign: 'left' },
  segment: { flexDirection: 'row', gap: 8, marginTop: 10 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E3EDF7', backgroundColor: '#FFFFFF' },
  segmentBtnActive: { backgroundColor: '#F0F5FA', borderColor: '#D7E6F5' },
  segmentText: { fontSize: 13, color: '#637788' },
  segmentTextActive: { color: '#1F5FA8', fontWeight: '600' },
  loading: { textAlign: 'center', color: '#637788', marginTop: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionHeader: { paddingTop: 14, paddingBottom: 6 },
  sectionTitle: { fontSize: 13, color: '#8A94A6' },
  item: { borderWidth: 1, borderColor: '#E3EDF7', borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: '#F8FAFF' },
  itemDate: { fontSize: 13, color: '#1F5FA8', fontWeight: '600', marginBottom: 6 },
  itemText: { fontSize: 14, color: '#111518', lineHeight: 20 },
  emotionRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  emotionChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#EAF2FC' },
  emotionChipText: { fontSize: 12, color: '#1F5FA8' },
  empty: { textAlign: 'center', color: '#8A94A6', marginTop: 40 },
});


