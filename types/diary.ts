// types/diary.ts

export type Emotion = 'terrible'|'bad'|'neutral'|'good'|'great';
export type Interaction = '안심신호'|'수리시도'|'확인요청'|'계획세움';

export interface DiaryEntry {
  userId: string;
  uid?: string; // 호환성: 과거 필드명
  coupleId?: string;
  date: string;            // YYYY-MM-DD
  emotion: Emotion;
  emotions?: Emotion[];
  hadConversation: boolean | null;
  goalsCompleted?: {
    conversation10min?: boolean;
    gratitudeShare?: boolean;
    dateActivity?: boolean;
    physicalTouch?: boolean;
  };
  text: string;
  timestampUtc: string;    // ISO (UTC)
  tags: string[];
  interactions: Interaction[];
  wordCount: number;
  source: 'manual'|'import'|'push';
  schemaVersion: 1;
  createdAt: number;
  updatedAt: number;
}


