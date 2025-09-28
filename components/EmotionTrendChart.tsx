import React from 'react';
import { View, Text } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

type Item = { date: string; emotion: number | string | null | undefined };

const EMOTION_LABELS = ['매우 부정','부정','중립','긍정','매우 긍정'];
const clamp = (n:number, min:number, max:number)=> Math.max(min, Math.min(max, n));
const mapStringToVal = (v: string) => {
  const s = String(v).toLowerCase();
  if (s === 'terrible') return -2;
  if (s === 'bad') return -1;
  if (s === 'neutral') return 0;
  if (s === 'good') return 1;
  if (s === 'great') return 2;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toLevel = (v:number|string) => clamp(Math.round(typeof v === 'string' ? mapStringToVal(v) : v) + 2, 0, 4);

export default function EmotionTrendChart({
  me = [],
  spouse = [],
}: {
  me?: Item[];
  spouse?: Item[];
}) {
  const safeMe = Array.isArray(me) ? me : [];
  const safeSpouse = Array.isArray(spouse) ? spouse : [];

  const labelFromDate = (d?: string, idx?: number) => (d ?? `D${(idx||0)+1}`).slice(5).replace('-', '/');

  const meData = safeMe.map((it, i) => ({
    value: toLevel(it?.emotion ?? 0),
    label: labelFromDate(it?.date, i),
  }));

  const spouseData = safeSpouse.map((it, i) => ({
    value: toLevel(it?.emotion ?? 0),
    label: labelFromDate(it?.date, i),
  }));

  const empty = meData.length === 0 && spouseData.length === 0;
  if (empty) {
    return (
      <View style={{height:140, alignItems:'center', justifyContent:'center'}}>
        <Text style={{color:'#6B7280'}}>최근 7일 데이터가 없어요</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: 4 }}>
      <LineChart
        data={meData}
        data2={spouseData}
        maxValue={4}
        minValue={0}
        noOfSections={4}
        yAxisLabelTexts={EMOTION_LABELS}
        yAxisLabelWidth={70}
        thickness={3}
        thickness2={3}
        color1="#198ae6"
        color2="#F35B5B"
        curved
        hideRules={false}
        rulesColor="#EDEFF2"
        hideDataPoints={false}
        dataPointsWidth={6}
        dataPointsHeight={6}
        xAxisThickness={0.5}
        yAxisThickness={0.5}
        initialSpacing={20}
        adjustToWidth
        showTextOnFocus
        textBackgroundRadius={6}
        textFontSize={10}
        pointerConfig={{ pointerStripUptoDataPoint: true }}
      />
    </View>
  );
}


