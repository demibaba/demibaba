import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export default function ReportsIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>분석 탭</Text>
      <Text style={styles.subtitle}>감정 분석 및 리포트</Text>
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