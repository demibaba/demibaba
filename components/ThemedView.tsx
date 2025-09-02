import { View, type ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // 새로운 디자인 컨셉에 맞춘 배경색
  const backgroundColor = '#ffffff'; // 흰색 배경

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
