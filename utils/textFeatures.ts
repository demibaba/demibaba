// utils/textFeatures.ts
import type { Interaction } from '../types/diary';

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

export function extractTagsAndInteractions(text: string): { tags: string[]; interactions: Interaction[] } {
  const tagsDict: Array<{ re: RegExp; label: string }> = [
    { re: /산책/g, label: '산책' },
    { re: /아침커피|카페/g, label: '아침커피' },
    { re: /일정.*(변경|취소)/g, label: '일정변경' },
  ];

  const interactionsDict: Array<{ re: RegExp; label: Interaction }> = [
    { re: /미안|사과/g, label: '수리시도' },
    { re: /포옹|안아/g, label: '수리시도' },
    { re: /괜찮아|여기있어|걱정마/g, label: '안심신호' },
    { re: /확인해줘|확인해 줄래|확인 좀/g, label: '확인요청' },
    { re: /계획|스케줄|일정 상의|약속 잡/g, label: '계획세움' },
  ];

  const t = String(text ?? '');

  const tags: string[] = [];
  for (const { re, label } of tagsDict) {
    if (re.test(t)) tags.push(label);
    re.lastIndex = 0;
  }

  const interactions: Interaction[] = [];
  for (const { re, label } of interactionsDict) {
    if (re.test(t)) interactions.push(label);
    re.lastIndex = 0;
  }

  return { tags: uniq(tags), interactions: uniq(interactions) as Interaction[] };
}

export function estimateWordCount(text: string): number {
  if (!text) return 0;
  return (text.trim().split(/\s+/).filter(Boolean)).length;
}


