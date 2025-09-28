// utils/extractTags.ts
// 문자열에서 태그 배열 추출
export function extractTags(text: string): string[] {
  if (!text) return [];
  const tags: string[] = [];

  // 1) 긍정/안정 신호
  if (/산책|걷기/.test(text)) tags.push('산책');
  if (/아침.*커피|모닝커피|커피/.test(text)) tags.push('아침커피');
  if (/밥|식사|저녁|점심|아침|같이.*먹/.test(text)) tags.push('식사공유');
  if (/잘했어|멋있어|예쁘다|잘한다/.test(text)) tags.push('칭찬');
  if (/고마워|감사/.test(text)) tags.push('감사표현');
  if (/포옹|안아|손잡|스킨십/.test(text)) tags.push('스킨십');
  if (/웃음|농담|재밌|유머/.test(text)) tags.push('웃음/유머');

  // 2) 관계 회복/수리 시도
  if (/미안|잘못했어|사과/.test(text)) tags.push('사과');
  if (/화해|풀자|다시 얘기/.test(text)) tags.push('화해');
  if (/괜찮아|걱정마|안심/.test(text)) tags.push('안심 신호');
  if (/나 사랑해|확인해줘|괜찮아 보여/.test(text)) tags.push('확인 요구');

  // 3) 갈등/위험 신호
  if (/다툼|싸움|언쟁/.test(text)) tags.push('갈등');
  if (/대화.*없|연락.*없|침묵/.test(text)) tags.push('침묵/단절');
  if (/짜증|화났|분노|성질/.test(text)) tags.push('짜증/분노');
  if (/서운|섭섭/.test(text)) tags.push('서운함/섭섭함');
  if (/무시|외면|쌩까/.test(text)) tags.push('무시/외면');
  if (/피곤|지침|힘들다/.test(text)) tags.push('피로/지침');

  // 4) 상황/맥락 태그
  if (/일정.*변경|약속.*취소|스케줄/.test(text)) tags.push('일정변경');
  if (/아이|아들|딸|육아|자녀/.test(text)) tags.push('육아');
  if (/집안일|청소|요리|빨래/.test(text)) tags.push('가사분담');
  if (/돈|지출|생활비|월급|용돈/.test(text)) tags.push('경제/돈');
  if (/아프|병원|건강|두통/.test(text)) tags.push('건강/몸상태');
  if (/회사|직장|업무|야근|상사/.test(text)) tags.push('일/직장 스트레스');
  if (/친구|지인|모임|술자리/.test(text)) tags.push('친구/사회생활');

  // 5) 특별 이벤트
  if (/기념일|결혼기념일|생일/.test(text)) tags.push('기념일/생일');
  if (/여행|외출|드라이브|캠핑/.test(text)) tags.push('여행/외출');
  if (/선물|꽃|깜짝|이벤트/.test(text)) tags.push('선물');
  if (/진지한 대화|깊은 얘기|중요한 얘기/.test(text)) tags.push('중요한 대화');

  // 중복 제거 & 최대 5개까지만 저장
  return Array.from(new Set(tags)).slice(0, 5);
}


