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

              {/* 일기 내용 */}
              <ScrollView style={styles.contentSection} showsVerticalScrollIndicator={false}>
                <DefaultText style={styles.contentText}>{content}</DefaultText>
              </ScrollView>

              {/* 편집 버튼 */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                  <Ionicons name="create-outline" size={20} color="#8D7A65" />
                  <DefaultText style={styles.editButtonText}>편집하기</DefaultText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8D7A65',
  },
  closeButton: {
    padding: 5,
  },
  emotionsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  emotionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8D7A65',
    marginBottom: 15,
  },
  emotionsScroll: {
    paddingHorizontal: 5,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  emotionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  emotionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  contentSection: {
    padding: 20,
    maxHeight: 300,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8D7A65',
    marginLeft: 8,
  },
});
