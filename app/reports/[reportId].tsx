import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import DefaultText from '../../components/DefaultText';
import CoupleReportView from '../../components/components/GottmanDashboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../../constants/theme';

// 안전한 텍스트 변환 함수
const safeStringify = (value: any): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[객체]';
    }
  }
  return String(value);
};

// 애착유형 객체 렌더링 함수
const renderAttachment = (attachment: any): string => {
  if (typeof attachment === 'string') return attachment;
  if (typeof attachment === 'object' && attachment) {
    if (attachment.type) {
      const confidence = attachment.confidence ? ` (신뢰도: ${attachment.confidence}%)` : '';
      return `${attachment.type}형${confidence}`;
    }
    return JSON.stringify(attachment);
  }
  return String(attachment || 'N/A');
};

// 러브랭귀지 객체 렌더링 함수
const renderLoveLanguage = (loveLanguage: any): string => {
  if (typeof loveLanguage === 'string') return loveLanguage;
  if (typeof loveLanguage === 'object' && loveLanguage) {
    if (loveLanguage.primary) {
      return `${loveLanguage.primary}${loveLanguage.secondary ? `, ${loveLanguage.secondary}` : ''}`;
    }
    return JSON.stringify(loveLanguage);
  }
  return String(loveLanguage || 'N/A');
};

// 안전한 배열 조인 함수
const safeJoin = (arr: any, separator: string = ', '): string => {
  if (!Array.isArray(arr)) return safeStringify(arr);
  return arr.map(item => safeStringify(item)).join(separator);
};

export default function ReportDetail() {
  const palette = (PALETTE as any) ?? { background: '#FAFBFC', card: '#FFFFFF', primarySoft: '#5B9BD5', primary: '#198ae6', text: '#1A1A1A', textSub: '#637788', border: '#E1E8ED' };
  const { reportId } = useLocalSearchParams<{reportId: string}>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(()=>{
    (async ()=>{
      if (!reportId) {
        setError('레포트 ID가 없습니다.');
        setLoading(false);
        return;
      }
      
      try {
        console.log('레포트 조회:', reportId);
        const snap = await getDoc(doc(db,'weeklyReports', String(reportId)));
        
        if (snap.exists()) {
          const data = snap.data();
          console.log('레포트 데이터:', data);
          setReport({ id: snap.id, ...data });
          
          // 읽음 표시
          if (!data.isRead) {
            await updateDoc(doc(db,'weeklyReports', snap.id), { isRead: true });
          }
        } else {
          console.log('레포트 문서가 존재하지 않음');
          setError('레포트를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('레포트 로드 오류:', err);
        setError('레포트를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  },[reportId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.primary}/>
        <DefaultText style={{color: palette.textSub, marginTop: 8}}>레포트를 불러오고 있어요…</DefaultText>
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={palette.textSub} />
        <DefaultText style={{color: palette.textSub, marginTop: 12}}>{error || '레포트를 찾을 수 없어요.'}</DefaultText>
        <TouchableOpacity 
          style={[styles.btn, {marginTop: 16}]} 
          onPress={() => router.back()}
        >
          <DefaultText style={styles.btnText}>돌아가기</DefaultText>
        </TouchableOpacity>
      </View>
    );
  }

  const es = report.emotionSummary || {};
  const ds = report.diaryStats || {};

  // 커플 레포트 전용 뷰 분기
  if (report.reportScope === 'couple' && report.coupleAnalysis) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom:40}}>
        <View style={styles.header}>
          <TouchableOpacity onPress={()=>router.back()} style={{padding:8}}>
            <Ionicons name="arrow-back" size={22} color={palette.text} />
          </TouchableOpacity>
          <DefaultText style={styles.headerTitle}>커플 레포트</DefaultText>
          <View style={{width:30}}/>
        </View>

        {/* 기간 */}
        <View style={styles.card}>
          <DefaultText style={styles.period}>
            {safeStringify(report.startDate)} ~ {safeStringify(report.endDate)}
          </DefaultText>
        </View>

        <View style={styles.card}>
          <DefaultText style={styles.sectionTitle}>개인 요약</DefaultText>
          <DefaultText style={styles.kv}>
            {safeStringify(report.coupleAnalysis?.individualSummary?.my?.name)}: {safeStringify(report.coupleAnalysis?.individualSummary?.my?.score)}점, {renderAttachment(report.coupleAnalysis?.individualSummary?.my?.attachment)}
          </DefaultText>
          <DefaultText style={styles.kv}>
            {safeStringify(report.coupleAnalysis?.individualSummary?.spouse?.name)}: {safeStringify(report.coupleAnalysis?.individualSummary?.spouse?.score)}점, {renderAttachment(report.coupleAnalysis?.individualSummary?.spouse?.attachment)}
          </DefaultText>
        </View>

        <View style={styles.card}>
          <DefaultText style={styles.sectionTitle}>커플 역학</DefaultText>
          <DefaultText style={styles.kv}>건강 점수: {safeStringify(report.coupleAnalysis?.coupleDynamics?.overallScore)}</DefaultText>
          <DefaultText style={styles.kvSub}>{safeStringify(report.coupleAnalysis?.coupleDynamics?.attachmentPattern?.dynamics)}</DefaultText>
        </View>

        <View style={styles.card}>
          <DefaultText style={styles.sectionTitle}>추천</DefaultText>
          <DefaultText style={styles.kv}>단기: {safeStringify(report.coupleAnalysis?.coupleRecommendations?.immediate?.map?.((a:any)=>a.action).join(', '))}</DefaultText>
          <DefaultText style={styles.kv}>주간: {safeStringify(report.coupleAnalysis?.coupleRecommendations?.weekly?.map?.((a:any)=>a.title).join(', '))}</DefaultText>
        </View>

        {/* 기존 대시보드 활용 가능 시 */}
        {/* <CoupleReportView report={report} /> */}

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
          {safeStringify(report.startDate)} ~ {safeStringify(report.endDate)}
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
        <DefaultText style={styles.kv}>
          긍정 {es.positive ?? 0}% · 중립 {es.neutral ?? 0}% · 부정 {es.negative ?? 0}%
        </DefaultText>
        {es.topEmotions?.length ? (
          <DefaultText style={styles.kvSub}>
            자주 나타난 감정: {safeJoin(es.topEmotions)}
          </DefaultText>
        ) : null}
      </View>

      {/* 기록 통계 */}
      <View style={styles.card}>
        <DefaultText style={styles.sectionTitle}>기록 통계</DefaultText>
        <DefaultText style={styles.kv}>기록한 날: {ds.daysActive ?? 0}일</DefaultText>
        <DefaultText style={styles.kv}>총 작성: {ds.totalEntries ?? 0}회</DefaultText>
        <DefaultText style={styles.kv}>평균 글자수: {ds.avgWordsPerEntry ?? 0} 단어</DefaultText>
        {ds.keywords?.length ? (
          <DefaultText style={styles.kvSub}>
            키워드: {safeJoin(ds.keywords)}
          </DefaultText>
        ) : null}
      </View>

      {/* 성향 요약(있으면) - 수정된 부분 */}
      {(report.profileBrief?.myAttachment || report.profileBrief?.spouseAttachment) && (
        <View style={styles.card}>
          <DefaultText style={styles.sectionTitle}>성향 요약</DefaultText>
          {report.profileBrief?.myAttachment && (
            <DefaultText style={styles.kv}>
              나의 애착 경향: {renderAttachment(report.profileBrief.myAttachment)}
            </DefaultText>
          )}
          {report.profileBrief?.spouseAttachment && (
            <DefaultText style={styles.kv}>
              배우자의 애착 경향: {renderAttachment(report.profileBrief.spouseAttachment)}
            </DefaultText>
          )}
          {report.profileBrief?.myLoveLanguage && (
            <DefaultText style={styles.kv}>
              나의 러브랭귀지: {renderLoveLanguage(report.profileBrief.myLoveLanguage)}
            </DefaultText>
          )}
          {report.profileBrief?.spouseLoveLanguage && (
            <DefaultText style={styles.kv}>
              배우자의 러브랭귀지: {renderLoveLanguage(report.profileBrief.spouseLoveLanguage)}
            </DefaultText>
          )}
        </View>
      )}

      {/* AI 인사이트 */}
      <View style={styles.card}>
        <DefaultText style={styles.sectionTitle}>AI 인사이트(참고용)</DefaultText>
        <DefaultText style={styles.aiText}>
          {safeStringify(report.aiInsights) || '인사이트 정보가 없습니다.'}
        </DefaultText>
      </View>

      {/* PDF 저장 버튼 */}
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
  center: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor: PALETTE.background, paddingHorizontal: 20 },
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
