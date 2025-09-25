import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import DefaultText from '../../components/DefaultText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../../constants/theme';

export default function ReportDetail() {
  const palette = (PALETTE as any) ?? { background: '#FAFBFC', card: '#FFFFFF', primarySoft: '#5B9BD5', primary: '#198ae6', text: '#1A1A1A', textSub: '#637788', border: '#E1E8ED' };
  const { reportId } = useLocalSearchParams<{reportId: string}>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  useEffect(()=>{
    (async ()=>{
      if (!reportId) return;
      const snap = await getDoc(doc(db,'weeklyReports', String(reportId)));
      if (snap.exists()) {
        setReport({ id: snap.id, ...snap.data() });
        // 읽음 표시
        if (!snap.data().isRead) {
          await updateDoc(doc(db,'weeklyReports', snap.id), { isRead: true });
        }
      }
      setLoading(false);
    })();
  },[reportId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.primary}/>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <DefaultText>레포트를 찾을 수 없어요.</DefaultText>
      </View>
    );
  }

  const es = report.emotionSummary || {};
  const ds = report.diaryStats || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom:40}}>
      <View style={styles.header}>
        <TouchableOpacity onPress={()=>router.back()} style={{padding:8}}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <DefaultText style={styles.headerTitle}>주간 레포트</DefaultText>
        <View style={{width:30}}/>
      </View>

      {/* 기간 */}
      <View style={styles.card}>
        <DefaultText style={styles.period}>
          {report.startDate} ~ {report.endDate}
        </DefaultText>
      </View>

      {/* 경고/안내 박스 */}
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={18} color={palette.primarySoft}/>
        <DefaultText style={styles.noticeText}>
          본 레포트는 참고용 정보이며, 의료적 진단이나 전문 상담을 대체하지 않습니다.
        </DefaultText>
      </View>

      {/* 감정 요약 */}
      <View style={styles.card}>
        <DefaultText style={styles.sectionTitle}>감정 요약</DefaultText>
        <DefaultText style={styles.kv}>긍정 {es.positive ?? 0}% · 중립 {es.neutral ?? 0}% · 부정 {es.negative ?? 0}%</DefaultText>
        {es.topEmotions?.length ? (
          <DefaultText style={styles.kvSub}>자주 나타난 감정: {es.topEmotions.join(', ')}</DefaultText>
        ) : null}
      </View>

      {/* 기록 통계 */}
      <View style={styles.card}>
        <DefaultText style={styles.sectionTitle}>기록 통계</DefaultText>
        <DefaultText style={styles.kv}>기록한 날: {ds.daysActive ?? 0}일</DefaultText>
        <DefaultText style={styles.kv}>총 작성: {ds.totalEntries ?? 0}회</DefaultText>
        <DefaultText style={styles.kv}>평균 글자수: {ds.avgWordsPerEntry ?? 0} 단어</DefaultText>
        {ds.keywords?.length ? (
          <DefaultText style={styles.kvSub}>키워드: {ds.keywords.join(', ')}</DefaultText>
        ) : null}
      </View>

      {/* 성향 요약(있으면) */}
      {(report.profileBrief?.myAttachment || report.profileBrief?.spouseAttachment) && (
        <View style={styles.card}>
          <DefaultText style={styles.sectionTitle}>성향 요약</DefaultText>
          {report.profileBrief?.myAttachment && (
            <DefaultText style={styles.kv}>나의 애착 경향: {report.profileBrief.myAttachment}</DefaultText>
          )}
          {report.profileBrief?.spouseAttachment && (
            <DefaultText style={styles.kv}>배우자의 애착 경향: {report.profileBrief.spouseAttachment}</DefaultText>
          )}
        </View>
      )}

      {/* AI 인사이트 */}
      <View style={styles.card}>
        <DefaultText style={styles.sectionTitle}>AI 인사이트(참고용)</DefaultText>
        <DefaultText style={styles.aiText}>
          {report.aiInsights}
        </DefaultText>
      </View>

      {/* (선택) PDF 저장은 추후 Phase 2에서 추가 */}
      <TouchableOpacity
        style={styles.btn}
        onPress={()=>Alert.alert('추후 제공','PDF 저장은 다음 업데이트에서 제공됩니다')}
      >
        <Ionicons name="document-text-outline" size={18} color="#fff"/>
        <DefaultText style={styles.btnText}>PDF로 저장</DefaultText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: PALETTE.background, paddingTop: 60 },
  center: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor: PALETTE.background },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:12, marginBottom:8 },
  headerTitle: { fontSize:18, fontWeight:'700', color: PALETTE.text },
  card: { backgroundColor: PALETTE.card, borderRadius:16, marginHorizontal:16, marginTop:12, padding:16, borderWidth:1, borderColor: PALETTE.border },
  period: { color: PALETTE.textSub, fontSize:12 },
  notice: {
    flexDirection:'row', alignItems:'center',
    backgroundColor:'#E6F4FF', borderRadius:12, marginHorizontal:16, marginTop:12, padding:12, gap:8
  },
  noticeText: { color: PALETTE.text, fontSize:12, flex:1 },
  sectionTitle: { fontSize:16, fontWeight:'700', color: PALETTE.text, marginBottom:6 },
  kv: { fontSize:14, color: PALETTE.text, marginTop:2 },
  kvSub: { fontSize:12, color: PALETTE.textSub, marginTop:4 },
  aiText: { color: PALETTE.text, lineHeight:20, marginTop:6 },
  btn: {
    marginHorizontal:16, marginTop:16, backgroundColor: PALETTE.primary,
    borderRadius:12, paddingVertical:14, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:8
  },
  btnText: { color:'#fff', fontWeight:'700' },
});
