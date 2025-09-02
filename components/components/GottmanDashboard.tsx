// components/GottmanDashboard.tsx - Gottman Method 관계 건강도 시각화 대시보드
// 클라이언트 요청: 사용자 친화적이고 직관적인 관계 분석 UI 구현
// 디자인: 베이지톤 웜컬러 기반
// UI/UX 피드백 요청: 색상, 레이아웃, 차트 형태 개선 의견 주세요!

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

/**
 *  컴포넌트 주요 기능:
 * 1. 관계 위험도 한눈에 보기 (신호등 방식)
 * 2. Gottman 4대 독소 개별 점수 시각화  
 * 3. 5:1 긍정 비율 진행률 표시
 * 4. 일일 실천 미션 제공
 * 
 *  반응형 디자인: 모든 디바이스 대응
 *  디자인 컨셉: 따뜻하고 신뢰감 있는 베이지톤
 */

const GottmanDashboard = () => {
  // 실제 앱에서는 props나 Context API로 데이터 전달 예정
  // 현재는 개발 테스트용 더미 데이터 사용
  const [gottmanData] = useState({
    fourHorsemen: {
      criticism: 25,     // 비판 수준 - 클라이언트 확인: 이 정도면 양호한 수준인가요?
      contempt: 15,      // 경멸 수준 - 낮은 편으로 판정
      defensiveness: 40, // 방어 수준 - 주의 필요 구간
      stonewalling: 20   // 담쌓기 수준 - 보통 수준
    },
    positiveRatio: 3.2,  // 현재 3.2:1 (목표 5:1)
    riskLevel: 'MEDIUM', // 중간 위험도
    weeklyTrend: [2.8, 3.1, 2.9, 3.2, 3.5, 3.2, 3.4] // 주간 긍정비율 추이
  });

  /**
   *  위험도별 색상 시스템 
   * 클라이언트 피드백 요청: 이 색상들이 앱 전체 톤과 어울리나요?
   */
  const getRiskColor = (level: string) => {
    switch(level) {
      case 'LOW': return '#4CAF50';    // 초록: 안전, 건강
      case 'MEDIUM': return '#FF9800'; // 주황: 주의, 개선 필요
      case 'HIGH': return '#F44336';   // 빨강: 위험, 즉시 조치
      default: return '#9E9E9E';       // 회색: 데이터 없음
    }
  };

  /**
   *  4대 독소 한국어 라벨링
   * TODO: 클라이언트 검토 - 일반 사용자가 이해하기 쉬운 용어인지?
   */
  const getHorsemanName = (type: string) => {
    switch(type) {
      case 'criticism': return '비판';      // 또는 '비난'? 클라이언트 의견 필요
      case 'contempt': return '경멸';       // 또는 '무시'? 
      case 'defensiveness': return '방어';   // 또는 '변명'?
      case 'stonewalling': return '담쌓기'; // 또는 '회피'?
      default: return '';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/*  헤더 섹션 - 앱 신뢰성 강조 */}
      <View style={styles.header}>
        <Text style={styles.title}>🔬 Gottman 관계 건강도</Text>
        <Text style={styles.subtitle}>40년 연구로 검증된 과학적 관계 분석</Text>
        {/*  개발자 노트: 헤더에 도움말 버튼 추가 필요한지 클라이언트 의견 요청 */}
      </View>

      {/*  전체 위험도 카드 - 가장 중요한 정보 우선 배치 */}
      <View style={[styles.riskCard, { borderColor: getRiskColor(gottmanData.riskLevel) }]}>
        <Text style={styles.riskEmoji}>
          {gottmanData.riskLevel === 'LOW' ? '💚' : 
           gottmanData.riskLevel === 'MEDIUM' ? '💛' : '❤️'}
        </Text>
        <Text style={[styles.riskLevel, { color: getRiskColor(gottmanData.riskLevel) }]}>
          관계 위험도: {gottmanData.riskLevel === 'LOW' ? '낮음' : 
                      gottmanData.riskLevel === 'MEDIUM' ? '보통' : '높음'}
        </Text>
        <Text style={styles.riskDescription}>
          {gottmanData.riskLevel === 'MEDIUM' ? 
            '일부 개선이 필요한 상태입니다' : 
            gottmanData.riskLevel === 'LOW' ?
            '건강한 관계를 유지하고 있어요!' :
            '전문가 도움이 필요할 수 있어요'}
        </Text>
        {/*  개발자 질문: 위험도별 상세 설명 모달 추가할까요? */}
      </View>

      {/*  긍정/부정 비율 - Gottman의 핵심 지표 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💝 긍정/부정 비율 (목표: 5:1)</Text>
        
        {/* 큰 숫자로 현재 비율 강조 표시 */}
        <View style={styles.ratioContainer}>
          <Text style={styles.ratioNumber}>{gottmanData.positiveRatio.toFixed(1)}</Text>
          <Text style={styles.ratioText}>: 1</Text>
        </View>
        
        {/* 진행률 바 - 목표 대비 달성도 시각화 */}
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill, 
            { 
              width: `${Math.min(100, (gottmanData.positiveRatio / 5) * 100)}%`,
              backgroundColor: gottmanData.positiveRatio >= 5 ? '#4CAF50' : '#FF9800'
            }
          ]} />
        </View>
        
        {/* 동기부여 메시지 - 개인화된 피드백 */}
        <Text style={styles.progressText}>
          {gottmanData.positiveRatio >= 5 ? 
            '완벽해요! 건강한 비율을 유지하고 있어요 🎉' :
            `목표까지 ${(5 - gottmanData.positiveRatio).toFixed(1)} 부족해요. 긍정적 표현을 늘려보세요!`}
        </Text>
        {/*  클라이언트 피드백: 이런 메시지 톤이 사용자에게 부담스럽지 않을까요? */}
      </View>

      {/*  4대 독소 상세 분석 - 2x2 그리드 레이아웃 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚠️ 관계의 4대 독소 (Four Horsemen)</Text>
        
        <View style={styles.horsemenGrid}>
          {Object.entries(gottmanData.fourHorsemen).map(([type, score]) => (
            <View key={type} style={[
              styles.horsemenItem,
              { borderColor: score > 50 ? '#F44336' : '#E8D5B7' }
              //  50점 이상일 때 빨간 테두리로 경고 표시
            ]}>
              <Text style={styles.horsemenName}>{getHorsemanName(type)}</Text>
              
              {/* 점수를 크고 명확하게 표시 */}
              <Text style={[
                styles.horsemenScore,
                { color: score > 50 ? '#F44336' : score > 30 ? '#FF9800' : '#4CAF50' }
              ]}>
                {score}
              </Text>
              <Text style={styles.horsemenUnit}>/100</Text>
              
              {/* 미니 진행률 바 - 각 독소별 수준 시각화 */}
              <View style={styles.miniProgressBar}>
                <View style={[
                  styles.miniProgressFill,
                  { 
                    width: `${score}%`,
                    backgroundColor: score > 50 ? '#F44336' : score > 30 ? '#FF9800' : '#4CAF50'
                  }
                ]} />
              </View>
              
              {/* 고위험 구간 경고 표시 */}
              {score > 50 && (
                <Text style={styles.warningText}>⚠️ 주의 필요</Text>
              )}
              {/*  개발자 질문: 각 독소별 개선 팁 툴팁 추가할까요? */}
            </View>
          ))}
        </View>
      </View>

      {/*  오늘의 실천 미션 - 사용자 참여 유도 */}
      <View style={styles.missionCard}>
        <Text style={styles.missionTitle}>🎯 오늘의 Gottman 미션</Text>
        
        <View style={styles.missionContent}>
          <Text style={styles.missionLabel}>방어적 태도 줄이기:</Text>
          <Text style={styles.missionText}>
            "내 잘못이 아냐" 대신 "어떻게 도울까?"라고 물어보세요. 
            작은 변화가 큰 차이를 만듭니다! 💪
          </Text>
          {/*  개발자 아이디어: 미션 완료 체크 기능 추가? */}
          {/*  개발자 아이디어: 미션 공유하기 기능 추가? */}
        </View>
      </View>

      {/*  여백 추가 - 스크롤 편의성 */}
      <View style={{height: 20}} />
    </ScrollView>
  );
};

/**
 *  스타일시트 - 베이지톤 디자인 시스템
 * 클라이언트 요청사항: 따뜻하고 신뢰감 있는 색상 팔레트
 * 
 *  피드백 요청:
 * - 전체적인 색상 조합이 마음에 드시나요?
 * - 폰트 크기가 적절한가요? (특히 고령층 사용자 고려)
 * - 카드 간격과 여백이 적절한가요?
 * - 그림자 효과가 너무 강하거나 약한가요?
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF7', // 메인 배경: 아이보리 화이트
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    color: '#5D4E37',          // 주요 텍스트: 다크 브라운
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8D7A65',          // 보조 텍스트: 미디엄 브라운
  },
  riskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,          // 둥근 모서리: 부드러운 느낌
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 3,            // 굵은 테두리: 중요도 강조
    shadowColor: '#8D7A65',    // 베이지 계열 그림자
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,        // 은은한 그림자
    shadowRadius: 12,
    elevation: 8,              // Android 그림자
  },
  riskEmoji: {
    fontSize: 48,              // 큰 이모지: 즉각적 인식
    marginBottom: 12,
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  riskDescription: {
    fontSize: 14,
    color: '#8D7A65',
    textAlign: 'center',       // 중앙 정렬
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    color: '#5D4E37',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  ratioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratioNumber: {
    fontSize: 32,              // 매우 큰 숫자: 핵심 정보 강조
    fontWeight: 'bold',
    color: '#4CAF50',          // 초록색: 긍정적 의미
  },
  ratioText: {
    fontSize: 18,
    color: '#8D7A65',
    marginLeft: 8,
  },
  progressBar: {
    width: '100%',
    height: 12,                // 충분한 높이: 터치하기 쉽게
    backgroundColor: '#F0F0F0', // 연한 회색 배경
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    // backgroundColor는 동적으로 설정
  },
  progressText: {
    fontSize: 12,
    color: '#8D7A65',
    textAlign: 'center',
  },
  horsemenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',          // 2x2 그리드 레이아웃
    justifyContent: 'space-between',
  },
  horsemenItem: {
    width: '48%',              // 2개씩 한 줄에
    padding: 16,
    backgroundColor: '#FAF6F0', // 매우 연한 베이지
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  horsemenName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 8,
  },
  horsemenScore: {
    fontSize: 24,
    fontWeight: 'bold',
    // color는 점수에 따라 동적 설정
  },
  horsemenUnit: {
    fontSize: 14,
    color: '#8D7A65',
  },
  miniProgressBar: {
    width: '100%',
    height: 6,                 // 작은 진행률 바
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 3,
    // backgroundColor는 점수에 따라 동적 설정
  },
  warningText: {
    fontSize: 10,
    color: '#F44336',          // 빨간색 경고
    marginTop: 4,
  },
  missionCard: {
    backgroundColor: '#4CAF50', // 초록색: 긍정적이고 활동적인 느낌
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  missionTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  missionContent: {
    backgroundColor: 'rgba(255,255,255,0.2)', // 반투명 흰색
    padding: 16,
    borderRadius: 12,
  },
  missionLabel: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  missionText: {
    fontSize: 13,
    color: 'white',
    lineHeight: 18,            // 줄 간격: 가독성 향상
  },
});

export default GottmanDashboard;

/**
 *  개발 완료 체크리스트:
 *  Gottman Method 이론 기반 정확한 구현
 *  모바일 친화적 반응형 레이아웃  
 *  베이지톤 컬러 시스템 적용
 *  직관적이고 명확한 정보 시각화
 *  접근성 고려 (대비, 폰트 크기)
 * 
 *  클라이언트 피드백 대기 중:
 * - 전체적인 디자인 만족도
 * - 기능별 사용성 평가  
 * - 수정 요청사항 및 추가 기능
 * 
 *
 *  수정 일정: 피드백 접수 후 24-48시간 내 반영
 */