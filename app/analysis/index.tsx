import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import EmotionTrendChart from '../../components/EmotionTrendChart';
import { generateWeeklyReport } from '../../services/reportService';

export default function AnalysisScreen() {
  const [loading, setLoading] = useState(false);

  const onPressReport = async () => {
    try {
      setLoading(true);
      const report = await generateWeeklyReport();
      Alert.alert('레포트 생성 완료', 'AI 레포트가 생성되어 보관함에 저장되었어요.');
      // router.push('/reports/detail?id=' + report.id);
    } catch (e: any) {
      Alert.alert('레포트 실패', e?.message ?? '레포트 생성 중 문제가 발생했어요.');
    } finally {
      setLoading(false);
    }
  };

  const showMiniCalendar = false;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>분석</Text>

      {/* {showMiniCalendar && <MiniCalendar />} */}

      {/* 감정 곡선: 기본 데모 데이터가 없으면 컴포넌트 내부 처리 */}
      <EmotionTrendChart />

      {/* 레포트 받기 버튼 */}
      <TouchableOpacity
        onPress={onPressReport}
        disabled={loading}
        style={{
          marginTop: 16,
          backgroundColor: '#198ae6',
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        }}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '700' }}>AI 레포트 받기</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}


