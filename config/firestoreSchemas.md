# Firestore Schemas - Weekly Couple Metrics

Collection path: `coupleMetrics/{coupleId}/{weekId}`

Document example:

```
{
  "coupleId": "xxx",
  "week": "2025-09-22",
  "synchrony": 62,
  "gapEpisodes": 2,
  "reassuranceLatency": 7.5,
  "repair": { "attempts": 3, "success": 2 },
  "confidence": 0.62,
  "triggers": {
    "days": ["Tue", "Fri"],
    "hours": ["09-10", "22-24"],
    "keywords": ["산책", "아침커피", "일정변경"]
  },
  "alerts": [ { "level": "red", "nextWindow": "Tue 09-10" } ],
  "experiments": [
    { "if": "아침9-10 끊김", "then": "90초 합의", "target": "gap→0" },
    { "if": "배우자 불안단서", "then": "2h 내 안심+일정", "target": "RL 7.5→3" },
    { "if": "밤10시 보통↑", "then": "10분 산책", "target": "sync +10%p" }
  ],
  "schemaVersion": 1,
  "createdAt": "ISO string",
  "createdBy": "job:weekly-cron"
}
```

Notes:
- `weekId` is typically `YYYY-MM-DD` Monday (or start day) of the week.
- `confidence` is a 0~1 score indicating data sufficiency.
- `triggers` are derived from top-variance day/hour buckets and top keywords.
