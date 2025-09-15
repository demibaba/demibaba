import React from 'react';
import { View, StyleSheet } from 'react-native';
import DefaultText from '../../components/DefaultText';

export default function ReportDetail() {
  return (
    <View style={styles.container}>
      <DefaultText style={styles.title}>리포트 상세</DefaultText>
      <DefaultText style={styles.subtitle}>준비 중이에요</DefaultText>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111518',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#637788',
  },
});


