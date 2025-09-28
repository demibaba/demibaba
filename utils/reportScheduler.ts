// utils/reportScheduler.ts - 긍정적인 레포트 스케줄링 시스템
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

export interface ReportSchedule {
  type: 'weekly' | 'monthly' | 'custom';
  interval: string;
  preparationDays: number;
  description: string;
  icon: string;
  color: string;
}

export interface ReportAvailability {
  available: boolean;
  status: 'ready' | 'preparing' | 'completed_recently';
  message: string;
  subtitle?: string;
  nextAvailable?: Date;
  progressInfo?: {
    current: number;
    required: number;
    description: string;
  };
}

export const REPORT_SCHEDULES: Record<'weekly' | 'monthly' | 'custom', ReportSchedule> = {
  weekly: {
    type: 'weekly',
    interval: '매주',
    preparationDays: 4,
    description: '일주일간의 감정 여정을 분석해드려요',
    icon: 'calendar-outline',
    color: '#4A90E2'
  },
  monthly: {
    type: 'monthly', 
    interval: '매월',
    preparationDays: 15,
    description: '한 달간의 성장과 변화를 정리해드려요',
    icon: 'stats-chart-outline',
    color: '#7B68EE'
  },
  custom: {
    type: 'custom',
    interval: '맞춤형',
    preparationDays: 3,
    description: '원하는 기간의 특별한 인사이트를 제공해요',
    icon: 'create-outline',
    color: '#FF9500'
  }
};

// 최근 다이어리 기록 수 조회
const getRecentDiaryCount = async (userId: string, days: number): Promise<number> => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const q = query(
      collection(db, 'diaries'),
      where('userId', '==', userId),
      where('date', '>=', formatDate(startDate)),
      where('date', '<=', formatDate(endDate))
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('다이어리 개수 조회 실패:', error);
    return 0;
  }
};

// 최근 생성된 레포트 조회
const getLastReport = async (userId: string, type: string) => {
  try {
    const q = query(
      collection(db, 'weeklyReports'),
      where('userId', '==', userId),
      where('type', '==', type),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    const firstDoc = snapshot.docs[0];
    if (!firstDoc) {
      return null;
    }
    const data = firstDoc.data();
    return data;
  } catch (error) {
    console.error('마지막 레포트 조회 실패:', error);
    return null;
  }
};

// 레포트 생성 가능 여부 체크
export const checkReportAvailability = async (
  userId: string, 
  reportType: 'weekly' | 'monthly' | 'custom'
): Promise<ReportAvailability> => {
  const schedule = REPORT_SCHEDULES[reportType];
  
  try {
    // 1. 최근 레포트 확인
    const lastReport = await getLastReport(userId, reportType);
    const now = new Date();

    if (lastReport) {
      const lastReportDate = new Date(lastReport.createdAt);
      const daysDiff = Math.floor((now.getTime() - lastReportDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const cooldownDays = reportType === 'weekly' ? 7 : reportType === 'monthly' ? 30 : 1;
      
      if (daysDiff < cooldownDays) {
        const remainingDays = cooldownDays - daysDiff;
        const nextAvailable = new Date(lastReportDate);
        nextAvailable.setDate(nextAvailable.getDate() + cooldownDays);
        
        return {
          available: false,
          status: 'completed_recently',
          message: `새로운 ${schedule.interval} 레포트 준비 중`,
          subtitle: remainingDays === 0 ? '곧 새로운 인사이트를 받아보실 수 있어요' : 
                   `${remainingDays}일 후에 새로운 분석을 제공해드릴게요`,
          nextAvailable
        };
      }
    }

    // 2. 충분한 데이터 확인
    const diaryCount = await getRecentDiaryCount(
      userId, 
      reportType === 'weekly' ? 7 : reportType === 'monthly' ? 30 : 7
    );

    if (diaryCount < schedule.preparationDays) {
      const needed = schedule.preparationDays - diaryCount;
      return {
        available: false,
        status: 'preparing',
        message: '더 정확한 분석을 위해 준비 중',
        subtitle: `${needed}일 더 기록하시면 완성도 높은 레포트를 받으실 수 있어요`,
        progressInfo: {
          current: diaryCount,
          required: schedule.preparationDays,
          description: '감정 기록'
        }
      };
    }

    // 3. 생성 가능
    return {
      available: true,
      status: 'ready',
      message: `${schedule.interval} 레포트 받기`,
      subtitle: schedule.description
    };

  } catch (error) {
    console.error('레포트 가용성 체크 실패:', error);
    return {
      available: false,
      status: 'preparing',
      message: '레포트 상태 확인 중',
      subtitle: '잠시만 기다려주세요'
    };
  }
};

// 모든 레포트 타입의 가용성 체크
export const checkAllReportAvailability = async (userId: string) => {
  const [weekly, monthly, custom] = await Promise.all([
    checkReportAvailability(userId, 'weekly'),
    checkReportAvailability(userId, 'monthly'), 
    checkReportAvailability(userId, 'custom')
  ]);

  return { weekly, monthly, custom };
};

// 다음 레포트 생성 가능 시간 계산
export const getNextReportTime = (reportType: 'weekly' | 'monthly'): string => {
  const now = new Date();
  
  if (reportType === 'weekly') {
    // 다음 일요일 계산
    const daysUntilSunday = (7 - now.getDay()) % 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    return nextSunday.toLocaleDateString('ko-KR', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
  } else {
    // 다음 달 첫째 주 일요일
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const firstSunday = new Date(nextMonth);
    firstSunday.setDate(1 + (7 - nextMonth.getDay()) % 7);
    return firstSunday.toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  }
};

// 레포트 생성 추적 (API 사용량 모니터링용)
export const trackReportGeneration = async (
  userId: string, 
  reportType: string, 
  metadata: any
) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    // 실제 구현에서는 별도 컬렉션에 사용량 기록
    console.log(`레포트 생성 추적: ${userId} - ${reportType} - ${today}`, metadata);
  } catch (error) {
    console.error('레포트 생성 추적 실패:', error);
  }
};