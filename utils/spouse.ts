import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';

export async function getSpouseUserId(): Promise<string | null> {
  if (!auth.currentUser) return null;
  const me = await getDoc(doc(db, 'users', auth.currentUser.uid));
  const data = me.data() as any;
  return data?.spouseUserId ?? null;
}

export async function getCoupleId(): Promise<string | null> {
  if (!auth.currentUser) return null;
  const me = await getDoc(doc(db, 'users', auth.currentUser.uid));
  const data = me.data() as any;
  return data?.coupleId ?? null;
}


