import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import DefaultText from '../../components/DefaultText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { auth, db } from '../../config/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DiaryEntry } from '../../types/diary';

import { getLast7Dates, calculateSynchronySimple, findGapEpisodesSimple } from '../../utils/coupleMetrics';
import { getSpouseUserId, getCoupleId } from '../../utils/spouse';
import { computeConfidence, confidenceLabel } from '../../utils/confidence';
import { buildAlerts } from '../../utils/alerts';
import { getWeekPattern } from '../../utils/timeHeat';
import { saveWeeklySnapshot } from '../../utils/metricsStore';
import CircularGauge from '../../components/CircularGauge';
import EmotionTrendChart from '../../components/EmotionTrendChart';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  // ---- 데이터 상태 (그대로 사용) ----
  const [loading, setLoading] = useState(true);
  const [spouseUid, setSpouseUid] = useState<string | null>(null);

  const [sync, setSync] = useState(0);
  const [gaps, setGaps] = useState<string[]>([]);
  const [conf, setConf] = useState(0);
  const [confLabelTxt, setConfLabelTxt] = useState<'낮음'|'보통'|'높음'>('낮음');
  const [alerts, setAlerts] = useState<{level:'red'|'yellow';message:string;nextWindow?:string}[]>([]);
  const [pattern, setPattern] = useState<{topDay?:string|null;topHour?:string|null;topKeywords?:string[]}>({});
  const [experiments, setExperiments] = useState<{id:string;if:string;then:string;target:string;done?:boolean}[]>([]);
  const [myEntries, setMyEntries] = useState<DiaryEntry[]>([]);
  const [spouseEntries, setSpouseEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;

      const _spouseUid = await getSpouseUserId();
      const coupleId = await getCoupleId();
      setSpouseUid(_spouseUid);

      const dates = getLast7Dates();
      const ymdMin = dates[0], ymdMax = dates[dates.length - 1];

      const my: DiaryEntry[] = [];
      const spouse: DiaryEntry[] = [];

      const qMy = query(collection(db,'diaries'),
        where('userId','==', uid),
        where('date','>=', ymdMin),
        where('date','<=', ymdMax)
      );
      const mySnap = await getDocs(qMy);
      mySnap.forEach(d=> my.push(d.data() as DiaryEntry));
      setMyEntries(my);

      // 배우자 미연결: 배너만 표시하고 종료
      if (!_spouseUid) { setLoading(false); return; }

      const qSp = query(collection(db,'diaries'),
        where('userId','==', _spouseUid),
        where('date','>=', ymdMin),
        where('date','<=', ymdMax)
      );
      const spSnap = await getDocs(qSp);
      spSnap.forEach(d=> spouse.push(d.data() as DiaryEntry));
      setSpouseEntries(spouse);

      const s = calculateSynchronySimple(my, spouse, dates);
      const ge = findGapEpisodesSimple(my, spouse, dates);

      const myDays = new Set(my.map(e=>e.date)).size;
      const spDays = new Set(spouse.map(e=>e.date)).size;
      const bothDays = dates.filter(d => my.some(e=>e.date===d) && spouse.some(e=>e.date===d)).length;
      const avgWords = avg([...my, ...spouse].map(e=>e.wordCount||0));
      const c = computeConfidence({ daysActive: Math.min(myDays, spDays), avgWordCount: avgWords, coverage: dates.length? (bothDays/dates.length):0 });

      const al = buildAlerts({ my, spouse });
      const pat = getWeekPattern([...my, ...spouse]);

      const exps = [
        { id:'exp1', if:'아침 9–10 대화 끊김', then:'90초 합의 시도', target:'불일치 2→0회' },
        { id:'exp2', if:'배우자 불안 기록',   then:'2시간 내 안정 신호 1문장', target:'지연 7.5h→3h' },
        { id:'exp3', if:'밤 10시 보통 이상',   then:'10분 산책', target:'동조율 +10%p' },
      ];

      if (coupleId) {
        await saveWeeklySnapshot(coupleId, dates[0]!, {
          kpis: { synchrony: s, gapEpisodes: ge.length, confidence: c },
          triggers: { days: pat.topDay? [pat.topDay]:[], hours: pat.topHour? [pat.topHour]:[], keywords: pat.topKeywords||[] },
          alerts: al,
          experiments: exps
        });
      }

      setSync(s); setGaps(ge); setConf(c); setConfLabelTxt(confidenceLabel(c));
      setAlerts(al); setPattern(pat); setExperiments(exps);
    } catch (e) {
      console.log('reports load error', e);
    } finally {
      setLoading(false);
    }
  }

  const onToggleExp = (id:string) => {
    setExperiments(prev => prev.map(x => x.id===id ? {...x, done: !x.done} : x));
  };

  // ---- UI ----
  if (loading) {
    return <View style={styles.page}><DefaultText>불러오는 중…</DefaultText></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <DefaultText style={styles.greeting}>안녕하세요 👋</DefaultText>
        <TouchableOpacity style={styles.bell}>
          <Ionicons name="notifications-outline" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Week strip (간단 버전) */}
      <View style={styles.weekStrip}>
        {renderWeekStrip()}
      </View>

      {/* Hero gradient card */}
      <LinearGradient
        colors={['#E9EAFD', '#F6E9FF']}
        start={{x:0, y:0}} end={{x:1, y:1}}
        style={styles.hero}
      >
        <DefaultText style={styles.heroTitle}>이번 주 핵심 코칭</DefaultText>
        <DefaultText style={styles.heroSub}>
          {pattern?.topDay || '—'}요일 · {pattern?.topHour || '—'} · {(pattern?.topKeywords||[])[0] || '키워드 없음'}
        </DefaultText>
        <TouchableOpacity style={styles.heroBtn}>
          <Ionicons name="sparkles-outline" size={16} color="#fff" />
          <DefaultText style={styles.heroBtnTxt}>AI 코칭 보기</DefaultText>
        </TouchableOpacity>
      </LinearGradient>

      {/* 원형 게이지 카드 */}
      <View style={styles.card}>
        <DefaultText style={styles.cardTitle}>관계 요약</DefaultText>
        <View style={{ alignItems: 'center', marginTop: 6 }}>
          <CircularGauge value={sync} subtitle={`동조율 (최근 7일)`} />
        </View>
      </View>

      {/* 감정 곡선 카드 */}
      <View style={styles.card}>
        <DefaultText style={styles.cardTitle}>감정 곡선 (최근 7일)</DefaultText>
        <EmotionTrendChart
          me={getLast7Dates().map(d => {
            const e = myEntries.find(x => x.date === d);
            return { date: d, emotion: (e?.emotion ?? null) as any };
          })}
          spouse={getLast7Dates().map(d => {
            const e = spouseEntries.find(x => x.date === d);
            return { date: d, emotion: (e?.emotion ?? null) as any };
          })}
          gapThreshold={2}
        />
      </View>

      {/* Wellness Overview → KPI Grid */}
      <DefaultText style={styles.sectionTitle}>관계 개요</DefaultText>
      <View style={styles.grid}>
        <KPIBox icon="sync-outline" label="동조율" value={`${sync}%`} accent="#4F7BF8" />
        <KPIBox icon="flash-outline" label="불일치" value={`${gaps.length}회`} accent="#FF8C5B" />
        <KPIBox icon="shield-checkmark-outline" label="신뢰도" value={confLabelTxt} accent="#5AC8A9" />
        <KPIBox icon="alert-circle-outline" label="경보" value={`${alerts.length}건`} accent="#FFC94B" />
      </View>

      {/* Alerts */}
      {alerts.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <DefaultText style={styles.cardTitle}>경보</DefaultText>
            <Badge tone="warning" text="예방 권고" />
          </View>
          {alerts.map((a, i) => (
            <View key={i} style={[styles.alertItem, a.level==='red'? styles.redBg : styles.yellowBg]}>
              <Ionicons name={a.level==='red'?'alert':'warning-outline'} size={16} color="#7A2800" />
              <DefaultText style={styles.alertText}>
                {a.message}{a.nextWindow ? ` • ${a.nextWindow}` : ''}
              </DefaultText>
            </View>
          ))}
        </View>
      )}

      {/* Insight (불일치 리스트) */}
      <View style={styles.card}>
        <DefaultText style={styles.cardTitle}>주요 인사이트</DefaultText>
        <RowLine icon="calendar-outline" text={
          gaps.length ? `불일치 ${gaps.length}회: ${gaps.join(', ')}` : '이번 주는 큰 불일치가 없었어요'
        } />
        <RowLine icon="time-outline" text={`KPI 기준일: 최근 7일`} />
        <RowLine icon="pricetags-outline" text={`핵심 키워드: ${(pattern?.topKeywords||[]).slice(0,2).join(', ') || '—'}`} />
      </View>

      {/* Experiments */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <DefaultText style={styles.cardTitle}>이번 주 실험</DefaultText>
          <Badge tone="info" text="2~3개만 시도" />
        </View>
        <View style={{ gap: 10 }}>
          {experiments.map(exp => (
            <TouchableOpacity
              key={exp.id}
              style={[styles.expCard, exp.done && styles.expDone]}
              onPress={()=>onToggleExp(exp.id)}
              activeOpacity={0.85}
            >
              <DefaultText style={styles.expIf}>If {exp.if}</DefaultText>
              <DefaultText style={styles.expThen}>Then {exp.then}</DefaultText>
              <DefaultText style={styles.expTarget}>목표: {exp.target}</DefaultText>
              <View style={styles.expStatusRow}>
                <Ionicons name={exp.done? 'checkmark-circle' : 'ellipse-outline'} size={16} color={exp.done? '#2E7D32' : '#8AA0C2'} />
                <DefaultText style={[styles.expStatus, exp.done? {color:'#2E7D32'} : {}]}>
                  {exp.done? '완료' : '실행하기'}
                </DefaultText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 배우자 미연결 배너 */}
      {!spouseUid && (
        <View style={[styles.card, styles.banner]}>
          <DefaultText style={styles.bannerTitle}>배우자 연결이 필요합니다</DefaultText>
          <DefaultText style={styles.bannerText}>설정에서 배우자를 연결하면 두 분의 데이터를 함께 분석합니다.</DefaultText>
          <TouchableOpacity style={styles.bannerBtn}><DefaultText style={styles.bannerBtnTxt}>설정으로 이동</DefaultText></TouchableOpacity>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

/* ---------- UI Sub-components ---------- */

function KPIBox({ icon, label, value, accent }:{
  icon: any; label: string; value: string; accent: string;
}) {
  return (
    <View style={styles.kpiBox}>
      <View style={[styles.kpiIconWrap, { backgroundColor: `${accent}22` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <DefaultText style={styles.kpiLabel}>{label}</DefaultText>
      <DefaultText style={styles.kpiValue}>{value}</DefaultText>
    </View>
  );
}

function RowLine({ icon, text }:{icon:any; text:string}) {
  return (
    <View style={styles.rowLine}>
      <Ionicons name={icon} size={16} color="#6B7280" />
      <DefaultText style={styles.rowText}>{text}</DefaultText>
    </View>
  );
}

function Badge({ tone, text }:{tone:'warning'|'info'; text:string}) {
  const style = tone==='warning'
    ? { bg:'#FFF7E0', fg:'#6B5B00', border:'#FFE3A6' }
    : { bg:'#EAF2FF', fg:'#0B3C8C', border:'#CFE0FF' };
  return (
    <View style={{ backgroundColor: style.bg, borderColor: style.border, borderWidth:1, paddingHorizontal:8, paddingVertical:4, borderRadius:8 }}>
      <DefaultText style={{ color: style.fg, fontSize:12, fontWeight:'700' }}>{text}</DefaultText>
    </View>
  );
}

function renderWeekStrip() {
  const today = new Date();
  const days = ['S','M','T','W','T','F','S'];
  const idx = today.getDay();
  return (
    <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
      {days.map((d, i)=>(
        <View key={i} style={{ alignItems:'center', width: (width-48)/7 }}>
          <DefaultText style={{ fontSize:12, color: i===idx? '#111':'#9AA3AF' }}>{d}</DefaultText>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: i===idx? '#4F7BF8' : 'transparent', marginTop:6
          }}/>
        </View>
      ))}
    </View>
  );
}

function avg(arr:number[]) { return arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  page:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#F8F9FC' },
  container:{ padding:16, gap:14, backgroundColor:'#F8F9FC' },

  header:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:6 },
  greeting:{ fontSize:18, fontWeight:'800', color:'#111' },
  bell:{ width:32, height:32, borderRadius:16, backgroundColor:'#fff', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#EEF0F3' },

  weekStrip:{ backgroundColor:'#fff', borderRadius:16, paddingVertical:12, paddingHorizontal:8, borderWidth:1, borderColor:'#EEF0F3' },

  hero:{ borderRadius:20, padding:18, marginTop:6 },
  heroTitle:{ fontSize:16, fontWeight:'800', color:'#1A1A1A' },
  heroSub:{ marginTop:4, color:'#3F3F46', fontSize:12 },
  heroBtn:{ marginTop:12, alignSelf:'flex-start', backgroundColor:'#3F5BF6', paddingHorizontal:12, paddingVertical:8, borderRadius:10, flexDirection:'row', alignItems:'center', gap:6 },
  heroBtnTxt:{ color:'#fff', fontWeight:'700', fontSize:12 },

  sectionTitle:{ marginTop:4, marginBottom:6, fontSize:14, fontWeight:'700', color:'#111' },

  grid:{ flexDirection:'row', flexWrap:'wrap', gap:10 },
  kpiBox:{ width: (width-16*2-10*1)/2, backgroundColor:'#fff', borderRadius:16, padding:14, borderWidth:1, borderColor:'#EEF0F3' },
  kpiIconWrap:{ width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center', marginBottom:8 },
  kpiLabel:{ fontSize:12, color:'#6B7280' },
  kpiValue:{ fontSize:18, fontWeight:'800', color:'#111', marginTop:2 },

  card:{ backgroundColor:'#fff', borderRadius:16, padding:16, borderWidth:1, borderColor:'#EEF0F3' },
  cardHeaderRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  cardTitle:{ fontSize:14, fontWeight:'800', color:'#111' },

  rowLine:{ flexDirection:'row', alignItems:'center', gap:8, marginTop:8 },
  rowText:{ fontSize:12, color:'#3F3F46', flex:1, flexWrap:'wrap' },

  alertItem:{ flexDirection:'row', alignItems:'center', gap:8, padding:10, borderRadius:12, marginTop:8, borderWidth:1 },
  redBg:{ backgroundColor:'#FFE5E5', borderColor:'#FFB3B3' },
  yellowBg:{ backgroundColor:'#FFF7E0', borderColor:'#FFE3A6' },
  alertText:{ fontSize:12, color:'#3F3F46', flex:1 },

  expCard:{ borderWidth:1, borderColor:'#EEF0F3', borderRadius:12, padding:12, backgroundColor:'#FAFBFF' },
  expDone:{ backgroundColor:'#F0FAF0', borderColor:'#CDEAC0' },
  expIf:{ fontWeight:'700', color:'#111' },
  expThen:{ marginTop:2, color:'#3F3F46' },
  expTarget:{ marginTop:6, fontSize:12, color:'#6B7280' },
  expStatusRow:{ marginTop:8, flexDirection:'row', alignItems:'center', gap:6 },
  expStatus:{ fontSize:12, color:'#8AA0C2', fontWeight:'700' },

  // 배우자 미연결 배너
  banner:{ backgroundColor:'#FFF7E0', borderColor:'#FFE3A6', borderWidth:1 },
  bannerTitle:{ fontSize:15, fontWeight:'800', marginBottom:6, color:'#9E6A00' },
  bannerText:{ fontSize:12, color:'#6B5B00', marginBottom:10 },
  bannerBtn:{ backgroundColor:'#FFCC66', borderRadius:10, paddingVertical:10, paddingHorizontal:14, alignSelf:'flex-start' },
  bannerBtnTxt:{ color:'#5A3B00', fontWeight:'800', fontSize:12 },
});
