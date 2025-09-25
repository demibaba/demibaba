import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import DefaultText from '../../components/DefaultText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebaseConfig';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { ensureWeeklyReport, generateReport } from '../../utils/reportGenerator';
import { PALETTE } from '../../constants/theme';

export default function ReportsIndex() {
  const palette = (PALETTE as any) ?? { background: '#FAFBFC', card: '#FFFFFF', primarySoft: '#5B9BD5', primary: '#198ae6', text: '#1A1A1A', textSub: '#637788', border: '#E1E8ED' };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [creating, setCreating] = useState<null | 'weekly' | 'monthly' | 'custom'>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) { setItems([]); setLoading(false); return; }

    // 지난 주 보고서 없으면 생성
    await ensureWeeklyReport();

    const qRef = query(
      collection(db, 'weeklyReports'),
      where('userId','==', user.uid),
      orderBy('startDate','desc')
    );
    const snap = await getDocs(qRef);
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setItems(rows);
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.primary} />
        <DefaultText style={{color: palette.textSub, marginTop: 8}}>레포트를 준비하고 있어요…</DefaultText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flexDirection:'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
        <ActionButton label="주간 즉시 생성" icon="time" loading={creating==='weekly'} onPress={async()=>{
          if (!auth.currentUser) return;
          try { setCreating('weekly'); await generateReport(auth.currentUser.uid,'weekly',{force:true}); await load(); }
          catch { Alert.alert('오류','생성 중 문제가 발생했어요.'); }
          finally { setCreating(null); }
        }} />
        <ActionButton label="월간 즉시 생성" icon="calendar" loading={creating==='monthly'} onPress={async()=>{
          if (!auth.currentUser) return;
          try { setCreating('monthly'); await generateReport(auth.currentUser.uid,'monthly',{force:true}); await load(); }
          catch { Alert.alert('오류','생성 중 문제가 발생했어요.'); }
          finally { setCreating(null); }
        }} />
        <ActionButton label="임의 기간" icon="create" onPress={()=> setCustomOpen(true)} />
      </View>
      <DefaultText style={styles.headerTitle}>주간 레포트</DefaultText>
      <FlatList
        data={items}
        keyExtractor={(it)=>it.id}
        renderItem={({item})=>(
          <TouchableOpacity style={styles.card} onPress={()=>router.push(`/reports/${item.id}` as any)}>
            <View style={styles.row}>
              <View style={[styles.badgeBase, badgeStyle(item.isRead)]}>
                <DefaultText style={styles.badgeText}>{item.isRead ? '읽음' : '새 레포트'}</DefaultText>
              </View>
              <DefaultText style={styles.dateText}>
                {item.startDate} ~ {item.endDate}
              </DefaultText>
            </View>

            <View style={styles.summaryRow}>
              <DefaultText style={styles.summaryText}>
                긍정 {item.emotionSummary?.positive ?? 0}% · 중립 {item.emotionSummary?.neutral ?? 0}% · 부정 {item.emotionSummary?.negative ?? 0}%
              </DefaultText>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.footerLeft}>
                <Ionicons name="document-text-outline" size={16} color={palette.primarySoft} />
                <DefaultText style={styles.footerText}>상세 보기</DefaultText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textSub} />
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={()=> <View style={{height:12}}/>}
        contentContainerStyle={{padding:16}}
      />

      <Modal visible={customOpen} transparent animationType="fade" onRequestClose={()=> setCustomOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <DefaultText style={styles.modalTitle}>임의 기간 레포트</DefaultText>
            <DefaultText style={styles.modalHint}>YYYY-MM-DD 형식</DefaultText>
            <TextInput placeholder="시작일 ex) 2025-02-01" value={start} onChangeText={setStart} style={styles.input} />
            <TextInput placeholder="종료일 ex) 2025-02-07" value={end} onChangeText={setEnd} style={styles.input} />
            <View style={{ flexDirection:'row', gap: 10 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: palette.background, borderColor: palette.border, borderWidth: 1 }]} onPress={()=> setCustomOpen(false)}>
                <DefaultText style={{ color: palette.text }}>취소</DefaultText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: palette.primary }]} onPress={async()=>{
                if (!auth.currentUser || !start || !end) { Alert.alert('입력 필요','시작/종료일을 입력하세요.'); return; }
                try { setCreating('custom'); await generateReport(auth.currentUser.uid,{start,end},{force:true}); setCustomOpen(false); setStart(''); setEnd(''); await load(); }
                catch { Alert.alert('오류','생성 중 문제가 발생했어요.'); }
                finally { setCreating(null); }
              }}>
                <DefaultText style={{ color:'#fff' }}>{creating==='custom' ? '생성중...' : '생성'}</DefaultText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionButton({ label, icon, onPress, loading }: { label: string; icon: any; onPress: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!!loading}
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderColor: PALETTE.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={PALETTE.primary} />
      ) : (
        <Ionicons name={icon} size={16} color={PALETTE.primary} />
      )}
      <DefaultText style={{ color: PALETTE.text, fontWeight: '600', fontSize: 13 }}>{label}</DefaultText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: PALETTE.background, paddingTop: 60 } as ViewStyle,
  center: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor: PALETTE.background } as ViewStyle,
  headerTitle: {
    fontSize: 22, fontWeight:'700', color: PALETTE.text,
    paddingHorizontal:16, marginBottom:12,
  } as TextStyle,
  card: {
    backgroundColor: PALETTE.card, borderRadius:16, padding:16,
    borderWidth:1, borderColor: PALETTE.border
  } as ViewStyle,
  row: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' } as ViewStyle,
  badgeBase: { paddingHorizontal:10, paddingVertical:4, borderRadius:12 } as ViewStyle,
  badgeText: { fontSize:12, color: PALETTE.primary, fontWeight:'600' } as TextStyle,
  dateText: { color: PALETTE.textSub, fontSize:12 } as TextStyle,
  summaryRow: { marginTop:10 } as ViewStyle,
  summaryText: { color: PALETTE.text, fontSize:14, fontWeight:'500' } as TextStyle,
  footerRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:12 } as ViewStyle,
  footerLeft: { flexDirection:'row', alignItems:'center', gap:6 } as ViewStyle,
  footerText: { color: PALETTE.primarySoft, fontWeight:'600' } as TextStyle,
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', alignItems:'center' } as ViewStyle,
  modalCard: { width:'86%', backgroundColor:'#fff', borderRadius:16, padding:20, gap:10, borderWidth:1, borderColor: PALETTE.border } as ViewStyle,
  modalTitle: { fontSize:18, fontWeight:'700', color: PALETTE.text } as TextStyle,
  modalHint: { fontSize:12, color: PALETTE.textSub, marginBottom:6 } as TextStyle,
  input: { borderWidth:1, borderColor: PALETTE.border, borderRadius:10, paddingHorizontal:12, paddingVertical:10, fontSize:14, marginBottom:8 } as TextStyle,
  btn: { flex:1, paddingVertical:12, borderRadius:10, alignItems:'center' } as ViewStyle,
});

const badgeStyle = (read: boolean): ViewStyle => ({
  backgroundColor: read ? '#E8F0FB' : '#E6F4FF',
});
