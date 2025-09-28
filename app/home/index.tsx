import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import CircularGauge from '../../components/CircularGauge';
import EmotionTrendChart from '../../components/EmotionTrendChart';
import { generateWeeklyReport } from '../../services/reportService';

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);

  const onPressReport = async () => {
    try {
      setLoading(true);
      const r = await generateWeeklyReport();
      // TODO: 토스트/알럿 등 사용자 피드백
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* 작은 캘린더 제거 */}

          {/* 관계 요약 카드 */}
          <View style={{ backgroundColor:'#fff', borderRadius:16, padding:16, marginTop:12 }}>
            <Text style={{ fontWeight:'700', marginBottom:8 }}>관계 요약</Text>
            <CircularGauge value={50} />
          </View>

          {/* 감정 곡선 카드 */}
          <View style={{ backgroundColor:'#fff', borderRadius:16, padding:16, marginTop:12 }}>
            <Text style={{ fontWeight:'700', marginBottom:8 }}>감정 곡선 (최근 7일)</Text>
            <EmotionTrendChart />
          </View>

          {/* 아래 정보 카드들 … */}
        </ScrollView>

        {/* 하단 고정 CTA */}
        <View style={{ position:'absolute', left:16, right:16, bottom:24 }}>
          <TouchableOpacity
            onPress={onPressReport}
            disabled={loading}
            style={{
              backgroundColor:'#198ae6',
              borderRadius:14,
              paddingVertical:16,
              alignItems:'center',
              elevation:3
            }}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'800' }}>AI 레포트 받기</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}


