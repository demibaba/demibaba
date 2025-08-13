import { View, type ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // 기본 배경색 사용
  const backgroundColor = '#F7F3E9'; // 기본 배경색

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
