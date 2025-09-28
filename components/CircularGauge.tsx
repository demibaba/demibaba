import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Text } from 'react-native-svg';

export default function CircularGauge({
  value, // 0~100
  subtitle = '동조율',
  size = 140,
  stroke = 12,
  color = '#4F7BF8',
}: { value: number; subtitle?: string; size?: number; stroke?: number; color?: string }) {
  const progress = Math.max(0, Math.min(100, value)) / 100;
  const startAngle = -Math.PI * 0.8;
  const endAngle = Math.PI * 0.8;
  const totalAngle = endAngle - startAngle;
  const radius = size / 2 - stroke / 2;

  const polarToCartesian = (cx: number, cy: number, r: number, angleRad: number) => {
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  };

  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const s = polarToCartesian(cx, cy, r, start);
    const e = polarToCartesian(cx, cy, r, end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const cx = size / 2;
  const cy = size / 2;
  const progEnd = startAngle + totalAngle * progress;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg height={size} width={size}>
        {/* 배경 트랙 */}
        <Path
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          stroke="#EFF2F7"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        {/* 진행 트랙 */}
        <Path
          d={describeArc(cx, cy, radius, startAngle, progEnd)}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        {/* 가운데 텍스트 */}
        <Text
          x="50%" y="48%" textAnchor="middle"
          fontSize={Math.round(size * 0.28)} fontWeight="700" fill="#111"
        >
          {`${Math.round(value)}%`}
        </Text>
        <Text
          x="50%" y="65%" textAnchor="middle"
          fontSize={Math.round(size * 0.12)} fill="#667085"
        >
          {subtitle}
        </Text>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  center: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
});


