// utils/advancedCoupleAnalysis.ts

export function generateAdvancedPrompt(payload:{
  metrics:{ synchrony:number; gapEpisodes:number; reassuranceLatency:number; repair:{attempts:number;success:number}};
  myData:{ attachment:'secure'|'anxious'|'avoidant' }; 
  spouseData:{ attachment:'secure'|'anxious'|'avoidant' };
  week:{ start:string; end:string };
  examples:{ days:any[] } // 날짜별 포인트 샘플(히트맵 상위 3개)
}): string {
  const { metrics, myData, spouseData, week, examples } = payload;

  const ruleHeader = [
    '[규칙] 모든 문장에 수치(%) 또는 개수(#) 포함',
    '[규칙] 최소 3개의 날짜/시간/키워드 언급',
    '[규칙] If–Then 3개 이상 제시',
    '[규칙] 마지막 줄에 신뢰도 배지 포함 (confidence: 0~1)',
  ].join('\n');

  const daysSample = (examples?.days || []).slice(0,3);

  const samplesText = daysSample.map((d:any, i:number) => `- ${i+1}) ${JSON.stringify(d)}`).join('\n');

  return [
    `분석 기간: ${week.start} ~ ${week.end}`,
    '',
    ruleHeader,
    '',
    '[메트릭 요약]',
    `- Synchrony: ${metrics.synchrony}%`,
    `- Gap Episodes: ${metrics.gapEpisodes}회`,
    `- Reassurance Latency: ${metrics.reassuranceLatency}h`,
    `- Repair Attempts: ${metrics.repair.attempts}회, Success: ${metrics.repair.success}회`,
    '',
    '[프로필]',
    `- 나의 애착: ${myData.attachment}`,
    `- 배우자 애착: ${spouseData.attachment}`,
    '',
    '[샘플 포인트(상위 3개)]',
    samplesText,
    '',
    '[분석 지침]',
    '- 날짜/시간/키워드를 최소 3개 포함하세요 (예: Tue 09-10, Fri 22-24, "산책", "아침커피", "일정변경").',
    '- 각 문장에 수치를 포함하세요 (예: +10%p, #2회, 7.5h 등).',
    '- If–Then 규칙 3개 이상 제안하세요.',
    '- 마지막 줄에 confidence 배지를 출력하세요.',
    '',
    '[출력 형식]',
    '- 6문장 이내 Executive Summary',
    '- KPI 해석 (각각 1문장)',
    '- If–Then 3개',
    '- [confidence: 0.00~1.00]',
  ].join('\n');
}


