import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// 간단 감정 정규화 (reportGenerator.ts의 규칙과 일치)
function normalizeEmotion(raw: any): string | null {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'great') return 'great';
  if (s === 'good') return 'good';
  if (s === 'neutral') return 'neutral';
  if (s === 'bad') return 'bad';
  if (s === 'terrible') return 'terrible';
  return null;
}

export async function getConnectedSpouseId(userId: string): Promise<string | null> {
  const u = await getDoc(doc(db, 'users', String(userId)));
  if (!u.exists()) return null;
  const data = u.data() as any;
  const spouseId: string | undefined = data?.spouseId;
  return spouseId && spouseId.length > 0 ? spouseId : null;
}

export async function getUserEmotions(userId: string, startDate?: string, endDate?: string): Promise<Record<string, string>> {
  const emotions: Record<string, string> = {};
  const constraints: any[] = [where('userId', '==', userId)];
  if (startDate) constraints.push(where('date', '>=', startDate));
  if (endDate) constraints.push(where('date', '<=', endDate));

  const qRef = query(
    collection(db, 'diaries'),
    ...constraints,
    orderBy('date', 'asc')
  );
  const snap = await getDocs(qRef);
  for (const d of snap.docs) {
    const e: any = d.data();
    const date: string = e?.date;
    if (!date) continue;
    let val: string | null = null;
    if (typeof e?.emotion === 'string') {
      val = normalizeEmotion(e.emotion);
    } else if (Array.isArray(e?.emotions) && e.emotions.length) {
      val = normalizeEmotion(e.emotions[0]);
    } else if (Array.isArray(e?.emotionStickers) && e.emotionStickers.length) {
      val = normalizeEmotion(e.emotionStickers[0]);
    }
    if (val) emotions[date] = val;
  }
  return emotions;
}

export async function getUserData(userId: string, startDate?: string, endDate?: string): Promise<any> {
  const u = await getDoc(doc(db, 'users', String(userId)));
  const profile = u.exists() ? (u.data() as any) : {};
  const dailyEmotions = await getUserEmotions(userId, startDate, endDate);

  return {
    userId,
    name: profile?.name ?? null,
    attachmentType: profile?.attachmentType ?? 'secure',
    personalityType: profile?.personalityType ?? null,
    loveLanguage: profile?.loveLanguage ?? null,
    phq9Score: Number(profile?.phq9Score ?? 0),
    gad7Score: Number(profile?.gad7Score ?? 0),
    ksmiScore: Number(profile?.ksmiScore ?? 0),
    dailyEmotions,
  };
}


