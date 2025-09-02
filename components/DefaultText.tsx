// components/DefaultText.tsx
import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";

/**
 * DefaultText: 기본 폰트를 적용한 커스텀 Text 컴포넌트
 * - TextProps를 그대로 받아서, style을 합쳐주는 방식
 */
export default function DefaultText(props: TextProps) {
  return (
    <Text {...props} style={[styles.defaultStyle, props.style]}>
      {props.children}
    </Text>
  );
}

const styles = StyleSheet.create({
  defaultStyle: {
    // 새로운 디자인 컨셉에 맞춘 기본 스타일
    fontFamily: "GmarketSansTTFLight",
    color: "#111518", // 주요 텍스트 색상
    fontSize: 16,
  },
});
