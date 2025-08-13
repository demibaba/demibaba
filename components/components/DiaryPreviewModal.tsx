// 캘린더에서 날짜 클릭 시 표시할 일기 프리뷰 모달
import React from 'react';
import { 
  Modal, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Dimensions,
  TouchableWithoutFeedback,
  FlatList 
} from 'react-native';
import DefaultText from './DefaultText';
import { Ionicons } from '@expo/vector-icons';

interface DiaryPreviewModalProps {
  visible: boolean;
  date: string;
  content: string;
  emotions: string[];
  onClose: () => void;
  onEdit: () => void;
}

const EMOTION_STICKERS = [
  { id: 'love', emoji: '🥰', label: '사랑', color: '#D4AC0D' },
  { id: 'happy', emoji: '😊', label: '행복', color: '#D4AC0D' },
  { id: 'grateful', emoji: '🙏', label: '감사', color: '#D4AC0D' },
  { id: 'calm', emoji: '😌', label: '평온', color: '#D4AC0D' },
  { id: 'jealous', emoji: '😔', label: '질투', color: '#E67E22' },
  { id: 'lonely', emoji: '💔', label: '외로움', color: '#E67E22' },
  { id: 'sorry', emoji: '🙏', label: '미안함', color: '#E67E22' },
  { id: 'anxious', emoji: '😰', label: '불안', color: '#A04000' },
  { id: 'sad', emoji: '😢', label: '슬픔', color: '#A04000' },
  { id: 'stressed', emoji: '😤', label: '스트레스', color: '#A04000' },
];

export default function DiaryPreviewModal({
  visible,
  date,
  content,
  emotions,
  onClose,
  onEdit
}: DiaryPreviewModalProps) {
  
  const formatDisplayDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-");
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dateObj = new Date(dateStr);
    const dayOfWeek = days[dateObj.getDay()];
    return `${parseInt(month)}월 ${parseInt(day)}일 (${dayOfWeek})`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* 헤더 */}
              <View style={styles.header}>
                <DefaultText style={styles.dateText}>
                  {date && formatDisplayDate(date)}
                </DefaultText>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#8D7A65" />
                </TouchableOpacity>
              </View>

              {/* 감정 태그 */}
              {emotions.length > 0 && (
                <View style={styles.emotionsSection}>
                  <DefaultText style={styles.emotionsTitle}>오늘의 감정</DefaultText>
                  <FlatList 
                    data={emotions}
                    renderItem={({ item }) => {
                      const sticker = EMOTION_STICKERS.find(s => s.id === item);
                      return sticker ? (
                        <View 
                          key={item} 
                          style={[styles.emotionTag, { backgroundColor: sticker.color }]}
                        >
                          <DefaultText style={styles.emotionEmoji}>{sticker.emoji}</DefaultText>
                          <DefaultText style={styles.emotionLabel}>{sticker.label}</DefaultText>
                        </View>
                      ) : null;
                    }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.emotionsScroll}
                  />
                </View>
              )}

              {/* 일기 내용 - 스크롤 가능한 영역 */}
              <View style={styles.contentWrapper}>
                <ScrollView
                  style={styles.contentScroll}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                  scrollEnabled={true}
                  contentContainerStyle={styles.contentContainer}
                  onScrollBeginDrag={() => console.log("📜 스크롤 시작")}
                  onScrollEndDrag={() => console.log("📜 스크롤 종료")}
                >
                  <DefaultText style={styles.diaryContent}>
                    {content}
                  </DefaultText>
                </ScrollView>
              </View>

              {/* 하단 버튼 */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                  <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                  <DefaultText style={styles.editButtonText}>수정하기</DefaultText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE0',
    backgroundColor: '#FFFFFF', // 배경색 명시
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4E37',
  },
  closeButton: {
    padding: 4,
  },
  emotionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE0',
    backgroundColor: '#FFFFFF', // 배경색 명시
  },
  emotionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8D7A65',
    marginBottom: 10,
  },
  emotionsScroll: {
    flexDirection: 'row',
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  emotionEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  emotionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    minHeight: 100, // 최소 높이 보장
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  diaryContent: {
    fontSize: 16,
    lineHeight: 26,
    color: '#5D4E37',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE0',
    backgroundColor: '#FFFFFF', // 배경색 명시
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9B8A3',
    paddingVertical: 14,
    borderRadius: 12,
  },
  editButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 