import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';

function looksLikeEmail(v?: string) {
  return !!v && v.includes('@');
}

export async function getSpouseUserId(): Promise<string | null> {
  if (!auth.currentUser) return null;
  const me = await getDoc(doc(db, 'users', auth.currentUser.uid));
  const data = me.data() as any;
  if (!data) return null;

  // 통일 스키마: spouseId 우선, 과거 필드 fallback
  const rawSpouseId: string | undefined =
    data?.spouseId ?? data?.connectedSpouseId ?? data?.spouseUserId ?? data?.spouseID;

  // 이메일 오기입 방지
  if (looksLikeEmail(rawSpouseId)) return null;

  const isLinked = data?.spouseStatus === 'accepted' && !!rawSpouseId;
  return isLinked ? String(rawSpouseId) : null;
}

export async function getCoupleId(): Promise<string | null> {
  if (!auth.currentUser) return null;
  const me = await getDoc(doc(db, 'users', auth.currentUser.uid));
  const data = me.data() as any;
  return data?.coupleId ?? null;
}

// 양방향 수락 배치 업데이트
export async function acceptSpouse(myUid: string, partnerUid: string) {
  const batch = writeBatch(db);
  const meRef = doc(db, 'users', myUid);
  const partnerRef = doc(db, 'users', partnerUid);

  batch.update(meRef, { spouseId: partnerUid, spouseStatus: 'accepted' });
  batch.update(partnerRef, { spouseId: myUid, spouseStatus: 'accepted' });

  await batch.commit();
}

// UI 매핑 유틸 (선택적 사용)
export function mapUserDocToUi(userDoc: any) {
  const spouseUid = userDoc?.spouseId ?? userDoc?.connectedSpouseId ?? userDoc?.spouseUserId ?? userDoc?.spouseID ?? null;
  const validSpouseUid = looksLikeEmail(spouseUid) ? null : spouseUid;
  const isSpouseLinked = userDoc?.spouseStatus === 'accepted' && !!validSpouseUid;
  return {
    spouseUid: validSpouseUid,
    isSpouseLinked,
    onboardingCompleted: !!userDoc?.onboardingCompleted,
  } as {
    spouseUid: string | null;
    isSpouseLinked: boolean;
    onboardingCompleted: boolean;
  };
}


