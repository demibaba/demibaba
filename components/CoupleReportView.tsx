import React from 'react';
import { View, StyleSheet } from 'react-native';
import DefaultText from './DefaultText';
import { PALETTE } from '../constants/theme';

export default function CoupleReportView({ report }: { report: any }) {
  const ca = report?.coupleAnalysis ?? {};
  return (
    <View style={styles.card}>
      <DefaultText style={styles.title}>커플 요약</DefaultText>
      <DefaultText style={styles.row}>
        감정 동조율: {String(ca?.coupleDynamics?.emotionalInteraction?.synchrony ?? '-') }%
      </DefaultText>
      <DefaultText style={styles.row}>
        상호 지지: {String(ca?.coupleDynamics?.emotionalInteraction?.support ?? '-') }%
      </DefaultText>
      <DefaultText style={styles.row}>
        관계 점수: {String(ca?.coupleDynamics?.overallScore ?? '-') }
      </DefaultText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: PALETTE.card, borderRadius:16, marginHorizontal:16, marginTop:12, padding:16, borderWidth:1, borderColor: PALETTE.border },
  title: { fontSize:16, fontWeight:'700', color: PALETTE.text, marginBottom:6 },
  row: { fontSize:14, color: PALETTE.text, marginTop:2 },
});


