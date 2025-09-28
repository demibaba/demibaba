import React from 'react';
import { View, StyleSheet } from 'react-native';
import DefaultText from './DefaultText';
import { PALETTE } from '../constants/theme';

function KPIBadge({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.badge}>
      <DefaultText style={styles.badgeLabel}>{label}</DefaultText>
      <DefaultText style={styles.badgeValue}>{value}</DefaultText>
      {sub ? <DefaultText style={styles.badgeSub}>{sub}</DefaultText> : null}
    </View>
  );
}

function AlertCard({ level, message, next }: { level: 'red'|'yellow'; message: string; next?: string }) {
  const color = level === 'red' ? '#D9534F' : '#F0AD4E';
  return (
    <View style={[styles.card, { borderColor: color }]}> 
      <DefaultText style={[styles.sectionTitle, { color }]}>Alert: {level.toUpperCase()}</DefaultText>
      <DefaultText style={styles.kv}>{message}</DefaultText>
      {next ? <DefaultText style={styles.kvSub}>Next window: {next}</DefaultText> : null}
    </View>
  );
}

export function AdvancedCoupleReport({ analysis }:{
  analysis:{
    kpis:{synchrony:number; gapEpisodes:number; reassuranceLatency:number; repair:{attempts:number;success:number}; confidence:number};
    alerts:{id:string;level:'red'|'yellow';message:string; nextWindow?:string}[];
    experiments:{ if:string; then:string; target:string }[];
    insightOneLiner:string;
  }
}){
  const { kpis, alerts, experiments, insightOneLiner } = analysis;
  return (
    <View style={{ paddingBottom: 24 }}>
      {/* Executive Summary */}
      <View style={styles.card}>
        <DefaultText style={styles.sectionTitle}>Executive Summary</DefaultText>
        <DefaultText style={styles.kv}>{insightOneLiner}</DefaultText>
        <DefaultText style={styles.kvSub}>신뢰도: {(kpis.confidence*100).toFixed(0)}%</DefaultText>
      </View>

      {/* KPI Badges */}
      <View style={[styles.card, { flexDirection:'row', gap:8 }]}> 
        <KPIBadge label="Synchrony" value={`${kpis.synchrony}%`} />
        <KPIBadge label="Gaps" value={`${kpis.gapEpisodes}`} />
        <KPIBadge label="Reassurance" value={`${kpis.reassuranceLatency}h`} />
        <KPIBadge label="Repair" value={`${kpis.repair.success}/${kpis.repair.attempts}`} />
      </View>

      {/* Alerts */}
      {alerts?.length ? alerts.map(a => (
        <AlertCard key={a.id} level={a.level} message={a.message} next={a.nextWindow} />
      )) : (
        <View style={styles.card}>
          <DefaultText style={styles.kvSub}>현재 주간 알림이 없습니다.</DefaultText>
        </View>
      )}

      {/* Experiments */}
      <View style={styles.card}>
        <DefaultText style={styles.sectionTitle}>Experiments</DefaultText>
        {experiments?.length ? experiments.map((e, idx) => (
          <DefaultText key={idx} style={styles.kv}>{`IF ${e.if} THEN ${e.then} → ${e.target}`}</DefaultText>
        )) : <DefaultText style={styles.kvSub}>데이터 희소: 질문형 인사이트로 대체합니다.</DefaultText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: PALETTE.card, borderRadius:16, marginHorizontal:16, marginTop:12, padding:16, borderWidth:1, borderColor: PALETTE.border },
  sectionTitle: { fontSize:16, fontWeight:'700', color: PALETTE.text, marginBottom:6 },
  kv: { fontSize:14, color: PALETTE.text, marginTop:2 },
  kvSub: { fontSize:12, color: PALETTE.textSub, marginTop:4 },
  badge: { flex:1, backgroundColor: '#F7FAFF', borderRadius:12, padding:12, borderWidth:1, borderColor:'#E1E8ED', alignItems:'center' },
  badgeLabel: { color: PALETTE.textSub, fontSize:12 },
  badgeValue: { color: PALETTE.text, fontSize:18, fontWeight:'700' },
  badgeSub: { color: PALETTE.textSub, fontSize:11 },
});
