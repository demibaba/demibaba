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
                
                {/* 월 선택 그리드 */}
                <ScrollView 
                  contentContainerStyle={styles.monthsGrid}
                  showsVerticalScrollIndicator={false}
                >
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
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8D7A65',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
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
    fontWeight: 'bold',
    color: '#8D7A65',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  monthItem: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderRadius: 15,
    backgroundColor: '#F8F6F3',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  selectedMonth: {
    backgroundColor: '#8D7A65',
    borderColor: '#8D7A65',
  },
  monthItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8D7A65',
  },
  selectedMonthText: {
    color: 'white',
  },
});
