// components/MonthPicker.tsx - 의료급 전문 스타일
import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DefaultText from './DefaultText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MonthPickerProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export default function MonthPicker({ currentMonth, onMonthChange }: MonthPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentMonth.getFullYear());
  const [tempMonth, setTempMonth] = useState(currentMonth.getMonth());

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  const handleMonthSelect = (monthIndex: number) => {
    setTempMonth(monthIndex);
    const newDate = new Date(selectedYear, monthIndex, 1);
    onMonthChange(newDate);
    setTimeout(() => setModalVisible(false), 150);
  };

  const changeYear = (increment: number) => {
    setSelectedYear(selectedYear + increment);
  };

  return (
    <>
      {/* 메인 버튼 - 더 세련되게 */}
      <TouchableOpacity 
        style={styles.mainButton} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <DefaultText style={styles.mainButtonText}>
          {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
        </DefaultText>
        <Ionicons name="chevron-down" size={20} color="#4A90E2" />
      </TouchableOpacity>

      {/* 모달 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {/* 헤더 - 의료급 스타일 */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity 
                    onPress={() => changeYear(-1)}
                    style={styles.yearButton}
                  >
                    <Ionicons name="chevron-back" size={24} color="#4A90E2" />
                  </TouchableOpacity>
                  
                  <View style={styles.yearTextContainer}>
                    <DefaultText style={styles.yearText}>{selectedYear}년</DefaultText>
                    <View style={styles.yearUnderline} />
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => changeYear(1)}
                    style={styles.yearButton}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#4A90E2" />
                  </TouchableOpacity>
                </View>

                {/* 월 선택 그리드 - 의료급 디자인 */}
                <View style={styles.monthGrid}>
                  {monthNames.map((month, index) => {
                    const isSelected = currentMonth.getMonth() === index && 
                                     currentMonth.getFullYear() === selectedYear;
                    const isCurrentMonth = new Date().getMonth() === index && 
                                         new Date().getFullYear() === selectedYear;
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.monthButton,
                          isSelected && styles.selectedMonthButton,
                          isCurrentMonth && styles.currentMonthButton,
                        ]}
                        onPress={() => handleMonthSelect(index)}
                        activeOpacity={0.7}
                      >
                        <DefaultText 
                          style={[
                            styles.monthButtonText,
                            isSelected && styles.selectedMonthText,
                            isCurrentMonth && styles.currentMonthText,
                          ]}
                        >
                          {month}
                        </DefaultText>
                        {isSelected && (
                          <View style={styles.selectedIndicator} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 하단 액션 버튼 */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={styles.todayButton}
                    onPress={() => {
                      const today = new Date();
                      onMonthChange(today);
                      setModalVisible(false);
                    }}
                  >
                    <DefaultText style={styles.todayButtonText}>오늘로 이동</DefaultText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <DefaultText style={styles.closeButtonText}>닫기</DefaultText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // 메인 버튼 스타일
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // 모달 오버레이
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 모달 컨텐츠 - 의료급 스타일
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },

  // 모달 헤더
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  yearButton: {
    padding: 8,
  },
  yearTextContainer: {
    alignItems: 'center',
  },
  yearText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  yearUnderline: {
    marginTop: 4,
    width: 40,
    height: 3,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },

  // 월 그리드 - 의료급 디자인
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  monthButton: {
    width: (SCREEN_WIDTH * 0.9 - 40 - 36) / 4, // 4열 그리드
    maxWidth: 75,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedMonthButton: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
    borderWidth: 1.5,
  },
  currentMonthButton: {
    backgroundColor: '#FFF3E0',
  },
  monthButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4E5969',
  },
  selectedMonthText: {
    color: '#1976D2',
    fontWeight: '700',
  },
  currentMonthText: {
    color: '#F57C00',
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 20,
    height: 3,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },

  // 모달 푸터
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  todayButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0E4FF',
  },
  todayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A90E2',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});