import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// 주간 분석이 필요한지 체크
export const checkWeeklyAnalysisNeeded = async (userId: string): Promise<boolean> => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // 일요일(0)에만 실행
  if (dayOfWeek !== 0) return false;
  
  // 이번 주 이미 분석했는지 확인
  const weekId = getWeekId(today);
  const analysisRef = doc(db, 'weeklyAnalysis', `${userId}_${weekId}`);
  const analysisDoc = await getDoc(analysisRef);
  
  return !analysisDoc.exists();
};

// 주간 ID 생성 (예: "2025_week_32")
const getWeekId = (date: Date): string => {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  return `${year}_week_${weekNumber}`;
};

// 주차 계산
const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// 일주일 치 일기 가져오기
export const getWeeklyDiaries = async (userId: string) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6); // 7일 전
  
  const diariesRef = collection(db, 'diaries');
  const q = query(
    diariesRef,
    where('userId', '==', userId),
    where('date', '>=', startDate.toISOString().split('T')[0]),
    where('date', '<=', endDate.toISOString().split('T')[0])
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}; 