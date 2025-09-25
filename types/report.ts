export type ReportType = 'weekly' | 'monthly';

export interface Report {
  id: string;              // doc id
  userId: string;
  type: ReportType;        // 'weekly' 우선
  startDate: string;       // 'YYYY-MM-DD'
  endDate: string;         // 'YYYY-MM-DD'

  // 요약 수치(팩트)
  emotionSummary: {
    positive: number;      // 0~100
    negative: number;      // 0~100
    neutral: number;       // 0~100
    topEmotions: string[]; // ['joy','sadness',...]
  };

  relationshipScore?: {    // (선택) 향후 확장
    criticism: number;
    contempt: number;
    defensiveness: number;
    stonewalling: number;
  };

  diaryStats: {
    totalEntries: number;
    daysActive: number;    // 기록한 일수
    avgWordsPerEntry: number;
    keywords: string[];
  };

  // 배우자/나 성향 요약(표시용)
  profileBrief?: {
    myAttachment?: string;
    spouseAttachment?: string;
    myLoveLanguage?: string;
    spouseLoveLanguage?: string;
  };

  // AI가 만든 텍스트(조심스러운 톤)
  aiInsights: string;

  createdAt: string;       // ISO
  isRead: boolean;
}
