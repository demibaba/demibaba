// 플로팅 월 선택기 컴포넌트
import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import DefaultText from './DefaultText';
import { Ionicons } from '@expo/vector-icons';

interface MonthPickerProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export default function MonthPicker({ currentMonth, onMonthChange }: MonthPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const months = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];
  
  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();
  
  const openPicker = () => {
    setShowPicker(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };
  
  const closePicker = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowPicker(false));
  };
  
  const selectMonth = (monthIndex: number) => {
    const newDate = new Date(currentYear, monthIndex, 1);
    onMonthChange(newDate);
    closePicker();
  };
  
  const changeYear = (increment: number) => {
    const newDate = new Date(currentYear + increment, currentMonthIndex, 1);
    onMonthChange(newDate);
  };
  
  return (
    <>
      {/* 메인 월 표시 버튼 */}
      <TouchableOpacity style={styles.monthButton} onPress={openPicker}>
        <DefaultText style={styles.monthText}>
          {currentYear}년 {currentMonthIndex + 1}월
        </DefaultText>
        <Ionicons name="chevron-down" size={20} color="#8D7A65" />
      </TouchableOpacity>
      
      {/* 월 선택 모달 */}
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="none"
        onRequestClose={closePicker}
      >
        <TouchableWithoutFeedback onPress={closePicker}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View 
                style={[
                  styles.pickerContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      })
                    }]
                  }
                ]}
              >
                {/* 년도 선택 */}
                <View style={styles.yearSelector}>
                  <TouchableOpacity onPress={() => changeYear(-1)}>
                    <Ionicons name="chevron-back" size={24} color="#C9B8A3" />
                  </TouchableOpacity>
                  <DefaultText style={styles.yearText}>{currentYear}년</DefaultText>
                  <TouchableOpacity onPress={() => changeYear(1)}>
                    <Ionicons name="chevron-forward" size={24} color="#C9B8A3" />
                  </TouchableOpacity>
                </View>
                
                {/* 월 그리드 */}
                <View style={styles.monthGrid}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.monthItem,
                        index === currentMonthIndex && styles.selectedMonth
                      ]}
                      onPress={() => selectMonth(index)}
                    >
                      <DefaultText style={[
                        styles.monthItemText,
                        index === currentMonthIndex && styles.selectedMonthText
                      ]}>
                        {month}
                      </DefaultText>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* 오늘 버튼 */}
                <TouchableOpacity 
                  style={styles.todayButton}
                  onPress={() => {
                    onMonthChange(new Date());
                    closePicker();
                  }}
                >
                  <DefaultText style={styles.todayButtonText}>오늘</DefaultText>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F9F6F3', // 흰색에서 웜톤 베이지로 변경
    borderRadius: 20,
    shadowColor: '#8D7A65',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8D5B7', // 테두리 추가
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4E37',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: width * 0.85,
    backgroundColor: '#F9F6F3', // 흰색에서 웜톤 베이지로 변경
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: '#E8D5B7', // 테두리 추가
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  yearText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5D4E37',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthItem: {
    width: '30%',
    paddingVertical: 15,
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: '#F7F3E9', // 더 연한 베이지로 변경
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D5B7', // 테두리 추가
  },
  selectedMonth: {
    backgroundColor: '#C9B8A3',
  },
  monthItemText: {
    fontSize: 16,
    color: '#5D4E37',
    fontWeight: '500',
  },
  selectedMonthText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  todayButton: {
    marginTop: 10,
    paddingVertical: 12,
    backgroundColor: '#E8D5B7', // 더 진한 베이지로 변경
    borderRadius: 12,
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 16,
    color: '#5D4E37', // 더 진한 색상으로 변경
    fontWeight: '600',
  },
});