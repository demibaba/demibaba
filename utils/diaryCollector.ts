// utils/diaryCollector.ts - 부부 일기 수집 유틸리티
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

// 날짜를 "YYYY-MM-DD" 형식으로 포맷하는 헬퍼 함수
function formatDateToString(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 단일 사용자의 주간 일기 수집
export async function getWeeklyDiaries(userId: string) {
  try {
    const today = new Date();
    const aWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStr = formatDateToString(today);
    const aWeekAgoStr = formatDateToString(aWeekAgo);

    const diariesRef = collection(db, "diaries");
    const q = query(
      diariesRef,
      where("userId", "==", userId),
      where("date", ">=", aWeekAgoStr),
      where("date", "<=", todayStr),
      orderBy("date", "desc")
    );

    const querySnap = await getDocs(q);
    const diaries = querySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`사용자 ${userId}의 주간 일기 수집 완료:`, diaries.length, "개");
    return diaries;
  } catch (error) {
    console.error("주간 일기 수집 오류:", error);
    return [];
  }
}

// 부부 일기 수집
export async function collectCoupleDiaries(userId: string, spouseId: string) {
  try {
    console.log("부부 일기 수집 시작...");
    
    // 두 사람의 7일치 일기 수집
    const [myDiaries, spouseDiaries] = await Promise.all([
      getWeeklyDiaries(userId),
      getWeeklyDiaries(spouseId)
    ]);
    
    console.log("부부 일기 수집 완료:");
    console.log("- 내 일기:", myDiaries.length, "개");
    console.log("- 배우자 일기:", spouseDiaries.length, "개");
    
    return { myDiaries, spouseDiaries };
  } catch (error) {
    console.error("부부 일기 수집 오류:", error);
    return { myDiaries: [], spouseDiaries: [] };
  }
}

// 일기 텍스트 결합
export function combineDiaryText(diaries: any[]): string {
  return diaries
    .map((diary) => `- ${diary.date}:\n${diary.text}\n`)
    .join("\n");
}

// 부부 통합 일기 텍스트 생성
export function createCoupleDiaryText(myDiaries: any[], spouseDiaries: any[]): string {
  const myText = combineDiaryText(myDiaries);
  const spouseText = combineDiaryText(spouseDiaries);
  
  return `=== 내 일기 ===\n${myText}\n\n=== 배우자 일기 ===\n${spouseText}`;
} 