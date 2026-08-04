import { HDate, HebrewCalendar, Sedra, flags } from '@hebcal/core';
import type { City, Layer, LayerKind } from './types';
import { dayZmanim, candleLighting } from './zmanim';
import { layersFor, slugify } from './layers';
import { addDays, cleanEventName, fmtCivilLong, fmtTime, hebDayMonth, hebMonthName, isoDate, stripNikud } from './format';

export interface CellLabel {
  title: string;
  kind: LayerKind;
  contentId?: string;
}

export interface MonthCell {
  iso: string;
  date: Date;
  hd: HDate;
  civilDay: number;
  hebDay: string;      // "ט׳"
  inMonth: boolean;
  isToday: boolean;
  isShabbat: boolean;
  labels: CellLabel[];
  candle?: string;     // הדלקת נרות (שישי / ערב חג)
  havdala?: string;    // צאת שבת/חג
}

export interface MonthGrid {
  title: string;      // כותרת ראשית
  subtitle: string;   // הקואורדינטה השנייה
  cells: MonthCell[];
}

function classifyForCell(f: number, desc: string): LayerKind {
  if (f & flags.MAJOR_FAST) return 'major-fast';
  if (f & flags.MINOR_FAST) return 'minor-fast';
  if (desc.startsWith('Chanukah')) return 'chanukah';
  if (desc.startsWith('Purim') || desc === 'Shushan Purim') return 'purim';
  if (f & flags.CHAG) return 'chag';
  if (f & flags.CHOL_HAMOED) return 'chol-hamoed';
  if (f & flags.ROSH_CHODESH) return 'rosh-chodesh';
  if (f & flags.SPECIAL_SHABBAT) return 'special-shabbat';
  if (f & flags.MODERN_HOLIDAY) return /HaZikaron|HaShoah/.test(desc) ? 'memorial' : 'modern';
  return 'minor';
}

const CELL_SKIP = flags.MOLAD | flags.SHABBAT_MEVARCHIM | flags.YOM_KIPPUR_KATAN | flags.EREV;

function cellFor(date: Date, city: City, inMonth: boolean, todayIso: string): MonthCell {
  const hd = new HDate(date);
  const iso = isoDate(date);
  const dow = date.getDay();
  const labels: CellLabel[] = [];

  const events = HebrewCalendar.getHolidaysOnDate(hd, true) ?? [];
  for (const ev of events) {
    const f = ev.getFlags();
    if (f & CELL_SKIP) continue;
    if (ev.getDesc() === 'Rosh Hashana LaBehemot') continue;
    labels.push({
      title: cleanEventName(ev.render('he')),
      kind: classifyForCell(f, ev.getDesc()),
      contentId: slugify(ev.basename()),
    });
  }

  let candle: string | undefined;
  let havdala: string | undefined;
  if (dow === 5) {
    candle = fmtTime(candleLighting(date, city));
  }
  if (dow === 6) {
    havdala = fmtTime(dayZmanim(date, city).tzeit);
    const sedra = new Sedra(hd.getFullYear(), true);
    const lookup = sedra.lookup(hd);
    if (!lookup.chag) {
      labels.push({ title: stripNikud(sedra.getString(hd, 'he')), kind: 'parsha', contentId: 'parsha' });
    }
  }

  return {
    iso,
    date,
    hd,
    civilDay: date.getDate(),
    hebDay: hebDayMonth(hd).split(' ')[0],
    inMonth,
    isToday: iso === todayIso,
    isShabbat: dow === 6,
    labels,
    candle,
    havdala,
  };
}

/** רשת חודש אזרחי (ראשון–שבת), 42 תאים */
export function civilMonthGrid(year: number, month0: number, city: City): MonthGrid {
  const first = new Date(year, month0, 1, 12);
  const last = new Date(year, month0 + 1, 0, 12);
  const gridStart = addDays(first, -first.getDay());
  const todayIso = isoDate(new Date());
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push(cellFor(d, city, d.getMonth() === month0, todayIso));
  }
  const title = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(first);
  const hFirst = new HDate(first);
  const hLast = new HDate(last);
  const year1 = stripNikud(hFirst.renderGematriya()).split(' ').pop();
  const year2 = stripNikud(hLast.renderGematriya()).split(' ').pop();
  const months =
    hFirst.getMonthName() === hLast.getMonthName()
      ? hebMonthName(hFirst)
      : `${hebMonthName(hFirst)}–${hebMonthName(hLast)}`;
  const subtitle = year1 === year2 ? `${months} ${year1}` : `${months} ${year1}–${year2}`;
  return { title, subtitle, cells };
}

/** רשת חודש עברי */
export function hebrewMonthGrid(hyear: number, hmonth: number, city: City): MonthGrid {
  const first = new HDate(1, hmonth, hyear);
  const days = first.daysInMonth();
  const offset = first.greg().getDay();
  const total = Math.ceil((offset + days) / 7) * 7;
  const todayIso = isoDate(new Date());
  const cells: MonthCell[] = [];
  for (let i = 0; i < total; i++) {
    const abs = first.abs() - offset + i;
    const hd = new HDate(abs);
    const inMonth = hd.getMonth() === hmonth && hd.getFullYear() === hyear;
    cells.push(cellFor(hd.greg(), city, inMonth, todayIso));
  }
  const yearStr = stripNikud(first.renderGematriya()).split(' ').pop();
  const title = `${hebMonthName(first)} ${yearStr}`;
  const gFirst = first.greg();
  const gLast = new HDate(days, hmonth, hyear).greg();
  const fmt = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
  const s1 = fmt.format(gFirst);
  const s2 = fmt.format(gLast);
  const subtitle = s1 === s2 ? s1 : `${s1} – ${s2}`;
  return { title, subtitle, cells };
}

export interface DayDetails {
  date: Date;
  iso: string;
  civilStr: string;
  hd: HDate;            // היום העברי של שעות היום
  hdStr: string;
  eveHd: HDate;         // היום העברי שנכנס בשקיעה
  eveHdStr: string;
  dayLayers: Layer[];
  eveLayers: Layer[];   // רק שכבות בולטות שנכנסות בערב
  zmanim: ReturnType<typeof dayZmanim>;
  candle?: string;
  havdala?: string;
}

/** פרטי יום אזרחי אחד: היום העברי שבו, ומה נכנס בערבו */
export function dayDetails(date: Date, city: City): DayDetails {
  const hd = new HDate(date);
  const eveHd = hd.next();
  const z = dayZmanim(date, city);
  const dayLayers = layersFor(hd, city);
  const eveLayers = layersFor(eveHd, city).filter((l) => l.rank >= 50);
  const dow = date.getDay();
  const enteringShabbatOrChag = eveLayers.some((l) => l.kind === 'shabbat' || l.kind === 'chag');
  const candle = dow === 5 || enteringShabbatOrChag ? fmtTime(candleLighting(date, city)) : undefined;
  const wasShabbatOrChag = dayLayers.some((l) => l.kind === 'shabbat' || l.kind === 'chag');
  const havdala = wasShabbatOrChag && !enteringShabbatOrChag ? fmtTime(z.tzeit) : undefined;
  return {
    date,
    iso: isoDate(date),
    civilStr: fmtCivilLong(date),
    hd,
    hdStr: hebDayMonth(hd),
    eveHd,
    eveHdStr: hebDayMonth(eveHd),
    dayLayers,
    eveLayers,
    zmanim: z,
    candle,
    havdala,
  };
}
