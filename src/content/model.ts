import type { LayerKind } from '../engine/types';

/**
 * תיוג של כל פסקת מידע — ההפרדה בין דין, מנהג, היסטוריה וממלכתי
 * היא עקרון יסוד של המוצר, לא קישוט.
 */
export type Tag =
  | 'דין'
  | 'מנהג'
  | 'מנהג קהילות'
  | 'טיפ'
  | 'היסטוריה'
  | 'ממלכתי'
  | 'מחלוקת'
  | 'הערה';

export interface Block {
  tag?: Tag;
  text: string;
}

export interface Section {
  title: string;
  blocks: Block[];
}

/** עוגני זמן שהמנוע יודע לפתור לשעה בפועל לפי מקום ותאריך */
export type TimeKey =
  | 'erev-candles'
  | 'erev-sunset'
  | 'erev-tzeit'
  | 'alot'
  | 'sunrise'
  | 'chatzot'
  | 'mincha-gedola'
  | 'sunset'
  | 'tzeit';

export interface TimelineItem {
  label: string;
  timeKey?: TimeKey;
  note?: string;
}

export type NowPhase = 'erev' | 'night' | 'morning' | 'afternoon' | 'motzaei';

export interface EventContent {
  id: string;
  name: string;
  kind: LayerKind;
  /** שורת מעמד: מה זה הדבר הזה מבחינת חיוב — דין, מנהג, יום ממלכתי */
  statusLine: string;
  statusTag: Tag;
  tldr: string;
  whatNow?: { phase: NowPhase; title: string; items: Block[] }[];
  timeline?: TimelineItem[];
  practical?: Section[];
  background?: Section[];
  differences?: Section[];
  sources?: { label: string; ref: string }[];
  /** שקיפות כיסוי: עמוד מלא או תקציר בלבד */
  coverage: 'full' | 'summary';
}
