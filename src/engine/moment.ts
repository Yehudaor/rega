import { HDate, HebrewCalendar, Sedra, flags, Event } from '@hebcal/core';
import type { City, Layer, LayerKind, PhaseKey, Snapshot, Transition, UpcomingItem } from './types';
import { dayZmanim, candleLighting } from './zmanim';
import { layersFor, slugify } from './layers';
import { addDays, fmtCivilLong, fmtCivilShort, fmtTime, hebDayMonth, isoDate, stripNikud } from './format';

const PHASE_LABEL: Record<PhaseKey, string> = {
  lateNight: 'לילה — לפנות בוקר',
  dawn: 'עלות השחר',
  morning: 'בוקר',
  afternoon: 'אחר הצהריים',
  beinHashmashot: 'בין השמשות',
  night: 'לילה',
};

function phaseOf(now: Date, z: ReturnType<typeof dayZmanim>): PhaseKey {
  if (now < z.alot) return 'lateNight';
  if (now < z.sunrise) return 'dawn';
  if (now < z.chatzot) return 'morning';
  if (now < z.sunset) return 'afternoon';
  if (now < z.tzeit) return 'beinHashmashot';
  return 'night';
}

/** רגע אחד, שתי קואורדינטות — כל מה שהממשק צריך כדי לצייר "עכשיו" */
export function makeSnapshot(now: Date, city: City): Snapshot {
  const z = dayZmanim(now, city);
  const afterSunset = now >= z.sunset;
  const civilHd = new HDate(now);
  const hd = afterSunset ? civilHd.next() : civilHd;
  const phase = phaseOf(now, z);
  const isNightTime = afterSunset || now < z.sunrise;

  // --- שכבות היום העברי הנוכחי ---
  const layers = layersFor(hd, city, { now, phase });

  // --- ניסוח מצב הגבול בין שתי מערכות הזמן ---
  let boundaryNote: string;
  if (phase === 'beinHashmashot') {
    boundaryNote = `בין השמשות — התאריך העברי התחלף בשקיעה (${fmtTime(z.sunset)}); צאת הכוכבים ב־${fmtTime(z.tzeit)}`;
  } else if (afterSunset) {
    boundaryNote = `התאריך העברי התחלף בשקיעה (${fmtTime(z.sunset)}); התאריך האזרחי יתחלף בחצות`;
  } else if (now < z.sunrise) {
    boundaryNote = 'היום העברי נמשך מהערב הקודם; התאריך האזרחי התחלף בחצות';
  } else {
    boundaryNote = `התאריך העברי יתחלף בשקיעה (${fmtTime(z.sunset)})`;
  }

  const dayMonth = hebDayMonth(hd);
  const displayName = isNightTime ? `ליל ${dayMonth}` : dayMonth;

  // --- מוצאי שבת / חג / צום ---
  let motzaeiNote: string | undefined;
  if (phase === 'night' || phase === 'beinHashmashot') {
    const prevLayers = layersFor(hd.prev(), city);
    const major = prevLayers.find((l) => l.rank >= 90);
    if (major) {
      const base = major.kind === 'shabbat' ? 'שבת' : major.title;
      motzaeiNote =
        major.kind === 'shabbat'
          ? `מוצאי שבת — הבדלה מצאת הכוכבים (${fmtTime(z.tzeit)})`
          : `מוצאי ${base}`;
    }
  }

  // --- מעברים קרובים ---
  const transitions: Transition[] = [];
  const push = (time: Date, label: string, priority: number) => {
    if (time > now) transitions.push({ time, label, priority });
  };

  // גבולות צום מתוך השכבות
  for (const l of layers) {
    if (l.window) {
      push(l.window.start, 'תחילת הצום', 95);
      push(l.window.end, 'צאת הצום', 95);
    }
  }

  // צאת שבת או חג — הבדלה (אלא אם נכנס מיד יום טוב נוסף)
  const todayMajor = layers.find((l) => (l.kind === 'shabbat' || l.kind === 'chag') && !l.window);
  const nextDayEvents = HebrewCalendar.getHolidaysOnDate(hd.next(), true) ?? [];
  const nextIsChag = nextDayEvents.some((e) => e.getFlags() & flags.CHAG);
  if (todayMajor && !nextIsChag) {
    const label = todayMajor.kind === 'shabbat' ? 'צאת השבת — הבדלה' : `צאת ${todayMajor.title}`;
    if (z.tzeit > now) {
      push(z.tzeit, label, 90);
    } else {
      // ליל שבת/חג — היציאה מחר בערב
      const zNext = dayZmanim(addDays(now, 1), city);
      push(zNext.tzeit, label, 90);
    }
  }

  // מה נכנס הערב? (היום העברי הבא ביחס לשעות שלפני שקיעה)
  const nextHd = hd.next();
  const nextLayers = layersFor(nextHd, city);

  // ערב מועד גדול הוא בעצמו "מה חשוב עכשיו" — לא יום רגיל
  if (!afterSunset) {
    const enteringMajor = nextLayers.find((l) => l.rank >= 80);
    if (enteringMajor && !layers.some((l) => l.rank >= 80)) {
      const isEveningFast = enteringMajor.id === 'tisha-bav' || enteringMajor.id === 'yom-kippur';
      const needsCandles = enteringMajor.kind === 'shabbat' || enteringMajor.kind === 'chag';
      let detail: string;
      if (isEveningFast) {
        detail = `הצום נכנס הערב בשקיעה (${fmtTime(z.sunset)})`;
      } else if (needsCandles) {
        detail = `הדלקת נרות ${fmtTime(candleLighting(now, city))} · שקיעה ${fmtTime(z.sunset)}`;
      } else if (enteringMajor.kind === 'major-fast' || enteringMajor.kind === 'minor-fast') {
        detail = `הצום יתחיל מחר בעלות השחר`;
      } else {
        detail = `נכנס הערב בשקיעה (${fmtTime(z.sunset)})`;
      }
      layers.push({
        id: `erev-${enteringMajor.id}`,
        title: `ערב ${enteringMajor.title}`,
        kind: enteringMajor.kind,
        rank: 88,
        contentId: enteringMajor.contentId,
        detail,
        iso: isoDate(addDays(now, 1)),
      });
      layers.sort((a, b) => b.rank - a.rank);
    }
  }
  const entering = nextLayers.find((l) => l.rank >= 80 && !l.window);
  const enteringFast = nextLayers.find((l) => l.kind === 'major-fast' || l.kind === 'minor-fast');
  const shabbatOrChagTonight = nextLayers.find((l) => l.kind === 'shabbat' || l.kind === 'chag');

  if (shabbatOrChagTonight) {
    // אחרי שקיעה — היום העברי הבא נכנס מחר בערב (האזרחי)
    const candleDay = afterSunset ? addDays(now, 1) : now;
    const candle = candleLighting(candleDay, city);
    push(candle, `הדלקת נרות — ${shabbatOrChagTonight.kind === 'shabbat' ? 'כניסת שבת' : shabbatOrChagTonight.title} (${city.name})`, 92);
  }
  if (!afterSunset && enteringFast) {
    // צום שנכנס הערב בשקיעה (ט' באב, יום כיפור)
    const slug = enteringFast.id;
    if (slug === 'tisha-bav' || slug === 'yom-kippur') {
      push(z.sunset, `שקיעה — תחילת ${enteringFast.title}`, 95);
    }
  }

  // זמני היסוד של היום
  const sunsetEntering = entering && !shabbatOrChagTonight ? ` — נכנס ${entering.title}` : '';
  push(z.sunset, `שקיעה — התאריך העברי מתחלף ל${hebDayMonth(nextHd)}${sunsetEntering}`, 62);
  push(z.tzeit, 'צאת הכוכבים', 45);
  push(z.alot, 'עלות השחר', 30);
  push(z.sunrise, 'הנץ החמה', 30);
  push(z.chatzot, 'חצות היום', 20);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  push(midnight, 'חצות — התאריך האזרחי מתחלף', 40);

  // מחר בבוקר (כשאנחנו כבר בלילה)
  const tomorrow = addDays(now, 1);
  const zTomorrow = dayZmanim(tomorrow, city);
  push(zTomorrow.alot, 'עלות השחר', 25);
  push(zTomorrow.sunrise, 'הנץ החמה', 25);

  // צום שמתחיל מחר בעלות השחר
  if (enteringFast && enteringFast.id !== 'tisha-bav' && enteringFast.id !== 'yom-kippur') {
    push(zTomorrow.alot, `עלות השחר — תחילת ${enteringFast.title}`, 90);
  }

  transitions.sort((a, b) => a.time.getTime() - b.time.getTime());
  // סינון כפילויות בטווח 2 דקות — נשארת בעלת העדיפות הגבוהה
  const deduped: Transition[] = [];
  for (const t of transitions) {
    const near = deduped.find((d) => Math.abs(d.time.getTime() - t.time.getTime()) < 2 * 60_000);
    if (near) {
      if (t.priority > near.priority) {
        deduped[deduped.indexOf(near)] = t;
      }
    } else {
      deduped.push(t);
    }
  }

  const horizon = now.getTime() + 26 * 3600_000;
  const inHorizon = deduped.filter((t) => t.time.getTime() <= horizon);
  const heroTransition = inHorizon.length
    ? inHorizon.reduce((best, t) => (t.priority > best.priority ? t : best), inHorizon[0])
    : deduped[0];

  return {
    now,
    city,
    zmanim: z,
    civil: { dateStr: fmtCivilLong(now), iso: isoDate(now) },
    hebrew: {
      hd,
      dateStr: hebDayMonth(hd) + ' ' + hebYear(hd),
      displayName,
      changedAtSunset: afterSunset,
      boundaryNote,
    },
    phase: { key: phase, label: PHASE_LABEL[phase] },
    isBeinHashmashot: phase === 'beinHashmashot',
    layers,
    motzaeiNote,
    heroTransition,
    nextTransitions: deduped.slice(0, 4),
    upcoming: upcomingItems(now, city),
  };
}

function hebYear(hd: HDate): string {
  const full = stripNikud(hd.renderGematriya());
  return full.split(' ').pop() ?? '';
}

const SKIP_FLAGS =
  flags.EREV | flags.MOLAD | flags.SHABBAT_MEVARCHIM | flags.YOM_KIPPUR_KATAN;

/** אירועים בולטים בשבועות הקרובים, מקובצים לפי יום */
function upcomingItems(now: Date, city: City): UpcomingItem[] {
  const start = addDays(now, 1);
  const end = addDays(now, 35);
  let events: Event[] = [];
  try {
    events = HebrewCalendar.calendar({ start, end, il: true, sedrot: true });
  } catch {
    events = [];
  }

  const byDate = new Map<string, { hd: HDate; date: Date; pieces: { title: string; kind: LayerKind; contentId?: string; rank: number }[] }>();

  for (const ev of events) {
    const f = ev.getFlags();
    if (f & SKIP_FLAGS) continue;
    // מועדי־מיקרו שרק מרעישים ברשימת "בהמשך"
    if (ev.getDesc() === 'Rosh Hashana LaBehemot') continue;
    const hd = ev.getDate();
    const date = hd.greg();
    const key = isoDate(date);
    const isParsha = Boolean(f & flags.PARSHA_HASHAVUA);
    const kind: LayerKind = isParsha
      ? 'parsha'
      : f & flags.MAJOR_FAST
        ? 'major-fast'
        : f & flags.MINOR_FAST
          ? 'minor-fast'
          : f & flags.CHAG
            ? 'chag'
            : f & flags.CHOL_HAMOED
              ? 'chol-hamoed'
              : f & flags.ROSH_CHODESH
                ? 'rosh-chodesh'
                : f & flags.SPECIAL_SHABBAT
                  ? 'special-shabbat'
                  : f & flags.MODERN_HOLIDAY
                    ? 'modern'
                    : 'minor';
    const rank: Record<LayerKind, number> = {
      'major-fast': 100, chag: 95, shabbat: 90, 'chol-hamoed': 85, purim: 84, chanukah: 83,
      'minor-fast': 80, memorial: 78, modern: 75, 'rosh-chodesh': 70, 'special-shabbat': 65,
      omer: 60, minor: 50, parsha: 40, period: 30,
    };
    let entry = byDate.get(key);
    if (!entry) {
      entry = { hd, date, pieces: [] };
      byDate.set(key, entry);
    }
    entry.pieces.push({
      title: stripNikud(ev.render('he')),
      kind,
      contentId: slugify(ev.basename()),
      rank: rank[kind],
    });
  }

  const items: UpcomingItem[] = [];
  const keys = [...byDate.keys()].sort();
  for (const key of keys) {
    const { hd, date, pieces } = byDate.get(key)!;
    pieces.sort((a, b) => b.rank - a.rank);
    const isShabbat = hd.getDay() === 6;
    const nonParsha = pieces.filter((p) => p.kind !== 'parsha');
    const parsha = pieces.find((p) => p.kind === 'parsha');
    let title: string;
    let kind: LayerKind;
    let contentId: string | undefined;
    if (isShabbat) {
      const specials = nonParsha.map((p) => p.title);
      const parts = specials.length ? specials : ['שבת'];
      if (parsha) parts.push(parsha.title);
      title = parts.join(' · ');
      kind = nonParsha[0]?.kind === 'special-shabbat' ? 'special-shabbat' : 'shabbat';
      contentId = nonParsha[0]?.contentId ?? 'shabbat';
    } else {
      if (!nonParsha.length) continue;
      title = nonParsha.map((p) => p.title).join(' · ');
      kind = nonParsha[0].kind;
      contentId = nonParsha[0].contentId;
    }
    items.push({
      date,
      hd,
      title,
      kind,
      contentId,
      dateStr: fmtCivilShort(date),
      hdStr: hebDayMonth(hd),
    });
    if (items.length >= 6) break;
  }
  return items;
}
