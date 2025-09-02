import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export default function DiaryIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>일기 탭</Text>
      <Text style={styles.subtitle}>일기 작성 및 관리</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111518',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#637788',
  },
});
