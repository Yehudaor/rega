import { HDate, Locale } from '@hebcal/core';

/** הסרת ניקוד וטעמים מטקסט עברי (משאיר מקף עברי ׀ U+05BE) */
export function stripNikud(s: string): string {
  return s.replace(/[֑-ֽֿ-ׇ]/g, '').replace(/‏/g, '');
}

const timeFmt = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jerusalem',
});
const longDateFmt = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem',
});
const shortDateFmt = new Intl.DateTimeFormat('he-IL', {
  weekday: 'short', day: 'numeric', month: 'long', timeZone: 'Asia/Jerusalem',
});

export function fmtTime(d: Date | undefined | null): string {
  if (!d || isNaN(d.getTime())) return '—';
  return timeFmt.format(d);
}

export function fmtCivilLong(d: Date): string {
  return longDateFmt.format(d);
}

export function fmtCivilShort(d: Date): string {
  return shortDateFmt.format(d);
}

/** ניסוחים מלאים יותר מברירת המחדל של הספרייה */
const NAME_OVERRIDES: Record<string, string> = {
  'יום כפור': 'יום הכיפורים',
  'ערב יום כפור': 'ערב יום הכיפורים',
};

/** שם מועד נקי — בלי מספר שנה לועזי ("ראש השנה 5787" ← "ראש השנה") */
export function cleanEventName(s: string): string {
  const clean = stripNikud(s).replace(/\s+\d{4}$/, '').trim();
  return NAME_OVERRIDES[clean] ?? clean;
}

/** "ט׳ באב תשפ״ו" */
export function hebDateStr(hd: HDate): string {
  return stripNikud(hd.renderGematriya());
}

/** "ט׳ באב" בלי שנה */
export function hebDayMonth(hd: HDate): string {
  const full = hebDateStr(hd);
  const parts = full.split(' ').slice(0, -1);
  const day = parts[0];
  const month = parts.slice(1).join(' ');
  return month ? `${day} ב${month}` : day;
}

/** אמש / היום / מחר — ביחס לתאריך ייחוס */
export function dayWord(d: Date, ref: Date): string {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const rr = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  const diff = Math.round((dd - rr) / 86_400_000);
  if (diff === 0) return 'היום';
  if (diff === -1) return 'אמש';
  if (diff === 1) return 'מחר';
  return '';
}

export function hebMonthName(hd: HDate): string {
  return stripNikud(Locale.gettext(hd.getMonthName(), 'he'));
}

/** YYYY-MM-DD לפי זמן מקומי */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // צהריים — בטוח מבעיות DST
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
