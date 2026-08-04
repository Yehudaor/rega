import { Event, HDate, HebrewCalendar, Sedra, flags, months } from '@hebcal/core';
import type { City, Layer, LayerKind, PhaseKey } from './types';
import { activePeriods } from './periods';
import { dayZmanim, candleLighting } from './zmanim';
import { fmtTime, hebDayMonth, stripNikud, addDays, dayWord, cleanEventName } from './format';

const RANK: Record<LayerKind, number> = {
  'major-fast': 100,
  chag: 95,
  shabbat: 90,
  'chol-hamoed': 85,
  purim: 84,
  chanukah: 83,
  'minor-fast': 80,
  memorial: 78,
  modern: 75,
  'rosh-chodesh': 70,
  'special-shabbat': 65,
  omer: 60,
  minor: 50,
  parsha: 40,
  period: 30,
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’׳"”]/g, '')
    .replace(/[^a-z0-9֐-׾]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** אילו מזהי תוכן קיימים — מוזן מבחוץ כדי למנוע תלות מעגלית */
let knownContent: Set<string> = new Set();
export function registerContentIds(ids: string[]): void {
  knownContent = new Set(ids);
}

function resolveContentId(slug: string, kind: LayerKind): string | undefined {
  // התאמה מדויקת, ואז קיצור הדרגתי: "rosh-hashana-ii" ← "rosh-hashana"
  let s = slug;
  while (s) {
    if (knownContent.has(s)) return s;
    const cut = s.lastIndexOf('-');
    if (cut < 0) break;
    s = s.slice(0, cut);
  }
  if (kind === 'rosh-chodesh' && knownContent.has('rosh-chodesh')) return 'rosh-chodesh';
  if (kind === 'shabbat' && knownContent.has('shabbat')) return 'shabbat';
  if (kind === 'special-shabbat' && knownContent.has('special-shabbat')) return 'special-shabbat';
  return undefined;
}

function classify(ev: Event): LayerKind {
  const f = ev.getFlags();
  const desc = ev.getDesc();
  if (f & flags.MAJOR_FAST) return 'major-fast';
  if (f & flags.MINOR_FAST) return 'minor-fast';
  if (desc.startsWith('Chanukah')) return 'chanukah';
  if (desc.startsWith('Purim') || desc === 'Shushan Purim') return 'purim';
  if (f & flags.CHAG) return 'chag';
  if (f & flags.CHOL_HAMOED) return 'chol-hamoed';
  if (f & flags.ROSH_CHODESH) return 'rosh-chodesh';
  if (f & flags.SPECIAL_SHABBAT) return 'special-shabbat';
  if (f & flags.MODERN_HOLIDAY) {
    return /HaZikaron|HaShoah/.test(desc) ? 'memorial' : 'modern';
  }
  if (f & flags.MINOR_HOLIDAY) return 'minor';
  return 'minor';
}

const KIND_LABEL: Record<LayerKind, string> = {
  'major-fast': 'צום',
  chag: 'יום טוב',
  'chol-hamoed': 'חול המועד',
  shabbat: 'שבת',
  'minor-fast': 'צום',
  chanukah: 'חנוכה',
  purim: 'פורים',
  'rosh-chodesh': 'ראש חודש',
  'special-shabbat': 'שבת מיוחדת',
  omer: 'ספירת העומר',
  memorial: 'יום זיכרון',
  modern: 'יום ממלכתי',
  minor: 'מועד קל',
  parsha: 'פרשת השבוע',
  period: 'תקופה',
};

export function kindLabel(kind: LayerKind): string {
  return KIND_LABEL[kind];
}

export interface FastWindow {
  start: Date;
  end: Date;
  startsEvening: boolean;
}

/**
 * חלון צום: ט' באב ויום כיפור נכנסים בערב; שאר הצומות מעלות השחר.
 * ביום כיפור הכניסה בזמן הדלקת הנרות (תוספת מחול על הקודש), כמקובל בלוחות.
 */
export function fastWindow(slug: string, hd: HDate, city: City): FastWindow {
  const day = hd.greg();
  const z = dayZmanim(day, city);
  const prevDay = addDays(day, -1);
  if (slug === 'yom-kippur') {
    return { start: candleLighting(prevDay, city), end: z.tzeit, startsEvening: true };
  }
  if (slug === 'tisha-bav') {
    return { start: dayZmanim(prevDay, city).sunset, end: z.tzeit, startsEvening: true };
  }
  return { start: z.alot, end: z.tzeit, startsEvening: false };
}

/** שם ידידותי לצום לפי שלב היום */
function fastTitle(baseName: string, phase: PhaseKey | undefined, active: boolean, ended: boolean): string {
  if (ended) return `מוצאי ${baseName}`;
  if (!active) return baseName;
  if (phase === 'night' || phase === 'beinHashmashot' || phase === 'lateNight') return `ליל ${baseName} — הצום בעיצומו`;
  return `${baseName} — הצום בעיצומו`;
}

export interface LayersOptions {
  now?: Date;
  phase?: PhaseKey;
}

/**
 * כל השכבות שחלות בתאריך עברי נתון, ממוינות מהעיקר אל המצטרף.
 * hd הוא התאריך העברי האפקטיבי (אחרי שקיעה — כבר היום הבא).
 */
export function layersFor(hd: HDate, city: City, opts: LayersOptions = {}): Layer[] {
  const layers: Layer[] = [];
  const events = HebrewCalendar.getHolidaysOnDate(hd, true) ?? [];

  for (const ev of events) {
    const f = ev.getFlags();
    // ערבי חג ותזכורות מטא — לא שכבה בפני עצמה (מטופלים כ"מעבר הבא")
    if (f & flags.EREV) continue;
    if (f & flags.SHABBAT_MEVARCHIM) continue;
    if (f & flags.MOLAD) continue;
    if (f & flags.YOM_KIPPUR_KATAN) continue;

    const kind = classify(ev);
    const slug = slugify(ev.basename());
    const title = cleanEventName(ev.render('he'));
    const layer: Layer = {
      id: slug,
      title,
      kind,
      rank: RANK[kind],
      contentId: resolveContentId(slug, kind),
    };

    if (kind === 'major-fast' || kind === 'minor-fast') {
      const w = fastWindow(slug, hd, city);
      layer.window = { start: w.start, end: w.end };
      const startName = !w.startsEvening
        ? 'עלות השחר'
        : slug === 'yom-kippur'
          ? 'הדלקת נרות'
          : 'שקיעה';
      if (opts.now) {
        const active = opts.now >= w.start && opts.now < w.end;
        const ended = opts.now >= w.end;
        layer.activeNow = active;
        layer.title = fastTitle(title, opts.phase, active, ended);
        const startWord = dayWord(w.start, opts.now);
        const endWord = dayWord(w.end, opts.now);
        const startPart = opts.now >= w.start
          ? `החל ${startWord} ב־${fmtTime(w.start)} (${startName})`
          : `יתחיל ${startWord} ב־${fmtTime(w.start)} (${startName})`;
        layer.detail = `${startPart} · צאת הצום ${endWord} ב־${fmtTime(w.end)} (צאת הכוכבים)`;
      } else {
        layer.detail = `הצום מ${startName} (${fmtTime(w.start)}) עד צאת הכוכבים (${fmtTime(w.end)})`;
      }
    }

    if (kind === 'rosh-chodesh') {
      layer.detail = 'יעלה ויבוא בתפילה ובברכת המזון; חצי הלל ומוסף';
    }

    layers.push(layer);
  }

  // שבת + פרשה
  if (hd.getDay() === 6) {
    const sedra = new Sedra(hd.getFullYear(), true);
    const parsha = stripNikud(sedra.getString(hd, 'he'));
    layers.push({
      id: 'shabbat',
      title: 'שבת',
      kind: 'shabbat',
      rank: RANK.shabbat,
      contentId: resolveContentId('shabbat', 'shabbat'),
      detail: parsha,
    });
  } else {
    // פרשת השבוע הקרובה — מידע שקט ביום חול
    const sat = new HDate(hd.abs() + (6 - hd.getDay()));
    const sedra = new Sedra(sat.getFullYear(), true);
    const lookup = sedra.lookup(sat);
    if (!lookup.chag) {
      layers.push({
        id: 'parsha',
        title: stripNikud(sedra.getString(sat, 'he')),
        kind: 'parsha',
        rank: RANK.parsha,
        contentId: resolveContentId('parsha', 'parsha'),
        detail: `השבת הקרובה — ${hebDayMonth(sat)}`,
      });
    }
  }

  layers.push(...activePeriods(hd));

  return layers.sort((a, b) => b.rank - a.rank);
}
