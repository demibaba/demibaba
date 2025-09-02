import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import DefaultText from '../components/DefaultText';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <DefaultText style={styles.title}>페이지를 찾을 수 없어요</DefaultText>
      <DefaultText style={styles.subtitle}>경로가 변경되었거나 삭제되었을 수 있어요</DefaultText>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/calendar')}>
        <DefaultText style={styles.buttonText}>홈으로 가기</DefaultText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111518',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#637788',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#198ae6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});


