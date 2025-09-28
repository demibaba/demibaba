// utils/metricsStore.ts
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export interface WeeklySnapshot {
  coupleId: string;
  week: string; // e.g. '2025-09-22'
  kpis: {
    synchrony: number;
    gapEpisodes: number;
    reassuranceLatency?: number;
    repair?: { attempts: number; success: number };
    confidence: number;
  };
  triggers?: { days?: string[]; hours?: string[]; keywords?: string[] };
  alerts?: { level: 'red'|'yellow'; message: string; nextWindow?: string }[];
  experiments?: { if: string; then: string; target: string }[];
  createdAt: number;
  schemaVersion: 1;
}

export async function saveWeeklySnapshot(
  coupleId: string,
  week: string,
  payload: Omit<WeeklySnapshot, 'createdAt'|'schemaVersion'|'coupleId'|'week'>
) {
  const ref = doc(collection(db, 'coupleMetrics'), `${coupleId}_${week}`);
  const now = Date.now();
  await setDoc(ref, {
    coupleId,
    week,
    ...payload,
    createdAt: now,
    schemaVersion: 1
  }, { merge: true });
}

type RepairAgg = { attempts: number; success: number };

export async function writeWeeklyCoupleMetrics(input: {
  coupleId: string;
  week: string; // YYYY-MM-DD
  synchrony: number;
  gapEpisodes: number;
  reassuranceLatency: number;
  repair: RepairAgg;
  confidence: number;
  triggers: { days: string[]; hours: string[]; keywords: string[] };
  alerts: Array<{ level: 'red'|'yellow'; nextWindow?: string }>;
  experiments: Array<{ if: string; then: string; target: string }>;
  createdBy?: string;
}) {
  const { coupleId, week } = input;
  const ref = doc(collection(db, 'coupleMetrics', coupleId, week));
  const data = {
    coupleId,
    week,
    synchrony: input.synchrony,
    gapEpisodes: input.gapEpisodes,
    reassuranceLatency: input.reassuranceLatency,
    repair: input.repair,
    confidence: input.confidence,
    triggers: input.triggers,
    alerts: input.alerts,
    experiments: input.experiments,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    createdBy: input.createdBy ?? 'job:weekly-cron',
  } as const;

  await setDoc(ref, data, { merge: false });
  return { id: ref.id };
}


