export interface UserProfile {
  uid: string;
  displayName?: string;
  coupleId?: string;       // 같은 커플을 묶는 ID
  spouseUserId?: string;   // 배우자 uid
  createdAt?: number;
  updatedAt?: number;
  schemaVersion?: 1;
}


