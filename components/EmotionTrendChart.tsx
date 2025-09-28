import React, { useMemo, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Line as SvgLine, Circle, Text as SvgText } from 'react-native-svg';
import DefaultText from './DefaultText';

type Emotion = 'terrible'|'bad'|'neutral'|'good'|'great';
const VAL: Record<Emotion, number> = { terrible:-2, bad:-1, neutral:0, good:1, great:2 };
const toLabel = (d: string) => d.slice(5).replace('-', '/'); // 'YYYY-MM-DD' -> 'MM/DD'

export interface DayPoint { date: string; emotion: Emotion | null; }

export default function EmotionTrendChart({
  me, spouse, gapThreshold = 2,
}: { me: DayPoint[]; spouse: DayPoint[]; gapThreshold?: number }) {

  const [chartWidth, setChartWidth] = useState(0);
  const chartHeight = 220;
  const leftAxisWidth = 28;
  const rightPadding = 8;
  const topInset = 16;
  const bottomInset = 16;
  const yMin = -2;
  const yMax = 2;
  const onLayout = (e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width);

  const { xLabels, yMe, ySp, gapIndex } = useMemo(() => {
    const len = Math.max(me.length, spouse.length);
    const labels: string[] = [];
    const myVals: (number | null)[] = [];
    const spVals: (number | null)[] = [];
    const gaps: number[] = [];

    for (let i = 0; i < len; i++) {
      const a = me[i];
      const b = spouse[i];
      const label = a?.date || b?.date || '';
      labels.push(toLabel(label));

      const va = a?.emotion ? VAL[a.emotion] : null;
      const vb = b?.emotion ? VAL[b.emotion] : null;
      myVals.push(va);
      spVals.push(vb);

      if (va !== null && vb !== null && Math.abs(va - vb) >= gapThreshold) gaps.push(i);
    }
    return { xLabels: labels, yMe: myVals, ySp: spVals, gapIndex: gaps };
  }, [me, spouse, gapThreshold]);

  const plotWidth = Math.max(0, chartWidth - leftAxisWidth - rightPadding);
  const xFor = (i: number) => {
    const n = Math.max(1, xLabels.length - 1);
    return leftAxisWidth + (plotWidth * (i / n));
  };
  const yFor = (v: number) => {
    const h = chartHeight - topInset - bottomInset;
    const t = (v - yMin) / (yMax - yMin);
    return topInset + (1 - t) * h;
  };

  const buildPath = (vals: (number | null)[]) => {
    let d = '';
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (v === null || v === undefined) {
        continue;
      }
      const x = xFor(i);
      const y = yFor(v);
      if (d === '') d = `M ${x} ${y}`; else d += ` L ${x} ${y}`;
    }
    return d;
  };

  return (
    <View style={styles.wrap}>
      <View style={{ flexDirection: 'row', height: chartHeight, paddingRight: rightPadding }}>
        {/* Y축 라벨 */}
        <View style={{ width: leftAxisWidth, marginRight: 0, justifyContent: 'space-between', paddingTop: topInset, paddingBottom: bottomInset }}>
          {[-2,-1,0,1,2].map(v => (
            <DefaultText key={v} style={{ color: '#6B7280', fontSize: 10 }}>{String(v)}</DefaultText>
          ))}
        </View>
        {/* 차트 */}
        <View style={{ flex: 1 }} onLayout={onLayout}>
          <Svg height={chartHeight} width={chartWidth}>
            {/* 그리드 */}
            {[-2,-1,0,1,2].map(v => (
              <SvgLine key={`g-${v}`} x1={leftAxisWidth} x2={leftAxisWidth + plotWidth} y1={yFor(v)} y2={yFor(v)} stroke="#EEF0F3" />
            ))}
            {/* 선들 */}
            <Path d={buildPath(yMe)} stroke="#3F5BF6" strokeWidth={2} fill="none" />
            <Path d={buildPath(ySp)} stroke="#FF7AA2" strokeWidth={2} fill="none" />
            {/* 갭 마커 */}
            {gapIndex.map(i => {
              const v = yMe[i];
              if (v === null || v === undefined) return null;
              return (
                <Circle key={`gap-${i}`} cx={xFor(i)} cy={yFor(v)} r={4} stroke="#FF5A5F" fill="#FFE5E5" strokeWidth={2} />
              );
            })}
          </Svg>

          {/* 범례 */}
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: '#3F5BF6' }]} />
            <View><LegendText>나</LegendText></View>
            <View style={{ width: 12 }} />
            <View style={[styles.dot, { backgroundColor: '#FF7AA2' }]} />
            <View><LegendText>배우자</LegendText></View>
          </View>
        </View>
      </View>

      {/* X축 라벨 */}
      <View style={{ marginTop: 6, marginLeft: leftAxisWidth, marginRight: rightPadding }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {xLabels.map((lbl, idx) => (
            <DefaultText key={idx} style={{ fontSize: 10, color: '#6B7280' }}>{lbl}</DefaultText>
          ))}
        </View>
      </View>
    </View>
  );
}

function LegendText({ children }: { children: React.ReactNode }) {
  return <DefaultText>{children as any}</DefaultText>;
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#EEF0F3' },
  legend: { position: 'absolute', top: 8, right: 12, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
});


