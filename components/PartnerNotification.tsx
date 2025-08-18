// components/PartnerNotification.tsx - 파트너 알림
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

export default function PartnerNotification() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'partnerReports'),
      where('toUserId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(newNotifications);
    });

    return unsubscribe;
  }, []);

  if (notifications.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💝 파트너 케어 가이드</Text>
      {notifications.map(notification => (
        <TouchableOpacity
          key={notification.id}
          style={styles.notificationCard}
          onPress={() => {/* 상세 보기 */}}
        >
          <Text style={styles.message}>
            파트너가 케어 가이드를 보내왔어요
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFBF7',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4E37',
    marginBottom: 12,
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E7E1DB',
    shadowColor: '#3B3029',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  message: {
    fontSize: 14,
    color: '#5D4E37',
    textAlign: 'center',
  },
});
