// 입력 데이터 기반 간단 신뢰도
export function computeConfidence({
  daysActive,        // 최근 7일 중 기록 일수: 0~7
  avgWordCount,      // 평균 단어 수
  coverage           // 두 사람 모두 기록한 날 비율: 0~1
}: { daysActive: number; avgWordCount: number; coverage: number }) {

  // 0~1로 정규화
  const nDays = Math.min(1, Math.max(0, daysActive / 7));
  const nWords = Math.min(1, Math.max(0, avgWordCount / 12)); // 12 단어 이상이면 충분
  const nCoverage = Math.min(1, Math.max(0, coverage));

  const conf = Math.min(nDays, nWords, nCoverage);
  return Math.round(conf * 100) / 100; // 0.00~1.00
}

export function confidenceLabel(c: number): '낮음'|'보통'|'높음' {
  if (c < 0.34) return '낮음';
  if (c < 0.67) return '보통';
  return '높음';
}


