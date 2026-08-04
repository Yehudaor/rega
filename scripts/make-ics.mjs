/**
 * מחולל פידי iCal — מהיום ועד 4 שנים קדימה, אל public/.
 * רץ אוטומטית לפני build (סקריפט prebuild).
 *
 * שני סוגי פידים:
 *   rega.ics          — הפיד הראשי: חגים, מועדים, ראשי חודשים ופרשות.
 *                       זהה לכל הארץ, ולכן קישור אחד שאפשר לשלוח לכל אחד.
 *   rega-<city>.ics   — אותו לוח + הדלקת נרות והבדלה לפי העיר (למי שרוצה זמנים).
 *
 * הערה: רשימת הערים משוכפלת מ־src/engine/cities.ts — לשמור מסונכרן.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HebrewCalendar, Location, flags } from '@hebcal/core';
import { eventsToIcalendar } from '@hebcal/icalendar';

const CITIES = [
  { id: 'jerusalem',   name: 'ירושלים',   lat: 31.778, lon: 35.235, candleMins: 40 },
  { id: 'tel-aviv',    name: 'תל אביב',   lat: 32.087, lon: 34.791, candleMins: 20 },
  { id: 'haifa',       name: 'חיפה',      lat: 32.794, lon: 34.989, candleMins: 30 },
  { id: 'beer-sheva',  name: 'באר שבע',   lat: 31.252, lon: 34.791, candleMins: 20 },
  { id: 'ashdod',      name: 'אשדוד',     lat: 31.804, lon: 34.655, candleMins: 20 },
  { id: 'netanya',     name: 'נתניה',     lat: 32.321, lon: 34.853, candleMins: 20 },
  { id: 'bnei-brak',   name: 'בני ברק',   lat: 32.084, lon: 34.833, candleMins: 20 },
  { id: 'petah-tikva', name: 'פתח תקווה', lat: 32.089, lon: 34.886, candleMins: 20 },
  { id: 'modiin',      name: 'מודיעין',   lat: 31.898, lon: 35.010, candleMins: 20 },
  { id: 'rehovot',     name: 'רחובות',    lat: 31.894, lon: 34.811, candleMins: 20 },
  { id: 'tzfat',       name: 'צפת',       lat: 32.965, lon: 35.496, candleMins: 20 },
  { id: 'tiberias',    name: 'טבריה',     lat: 32.789, lon: 35.531, candleMins: 20 },
  { id: 'eilat',       name: 'אילת',      lat: 29.558, lon: 34.948, candleMins: 20 },
];

/** ימי ציון קטנים שהופכים את היומן לרועש */
const SKIP_DESC = new Set([
  'Leil Selichot',
  'Yom HaAliyah', 'Yom HaAliyah School Observance',
  'Herzl Day', 'Ben-Gurion Day', 'Jabotinsky Day', 'Rabin Day',
  'Family Day', 'Hebrew Language Day', 'Chag HaBanot', 'Sigd',
  'Yom HaKippurim Katan', 'Rosh Hashana LaBehemot',
]);

const SKIP_FLAGS = flags.EREV | flags.MOLAD | flags.SHABBAT_MEVARCHIM | flags.YOM_KIPPUR_KATAN;

const isZman = (ev) => {
  const d = ev.getDesc();
  return d === 'Candle lighting' || d === 'Havdalah';
};

function keep(ev, withZmanim) {
  if (isZman(ev)) return withZmanim;
  if (ev.getFlags() & SKIP_FLAGS) return false;
  if (SKIP_DESC.has(ev.getDesc())) return false;
  return true;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(outDir, { recursive: true });

const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), 1);
const end = new Date(now.getFullYear() + 4, now.getMonth(), 1);

/** פיד נפרד: התאריך העברי בכל יום, כאירוע יום־שלם */
async function buildHebrewDates() {
  const events = HebrewCalendar.calendar({
    start,
    end,
    il: true,
    addHebrewDates: true,
    locale: 'he-x-NoNikud',
    yomKippurKatan: false,
    molad: false,
  }).filter((ev) => ev.getFlags() & flags.HEBREW_DATE);

  const ics = await eventsToIcalendar(events, {
    title: 'רגע · תאריך עברי',
    caldesc:
      'התאריך העברי בכל יום, כאירוע יום־שלם. שימו לב: יומנים בנויים על יממה שמתחילה בחצות, ולכן התאריך מוצג ליום האזרחי ואינו מתחלף בשקיעה.',
    prodid: '-//rega//iCal dates//HE',
    relcalid: 'rega-dates',
    locale: 'he-x-NoNikud',
    il: true,
  });

  writeFileSync(join(outDir, 'rega-dates.ics'), ics, 'utf8');
  console.log(`✓ rega-dates.ics (${events.length} events)`);
}

async function build({ file, title, caldesc, relcalid, location, candleMins, withZmanim }) {
  const events = HebrewCalendar.calendar({
    start,
    end,
    il: true,
    sedrot: true,
    candlelighting: withZmanim,
    ...(withZmanim ? { candleLightingMins: candleMins, havdalahDeg: 8.5, location } : {}),
    locale: 'he-x-NoNikud',
    yomKippurKatan: false,
    molad: false,
  }).filter((ev) => keep(ev, withZmanim));

  const ics = await eventsToIcalendar(events, {
    title,
    caldesc,
    prodid: `-//rega//iCal ${relcalid}//HE`,
    relcalid,
    locale: 'he-x-NoNikud',
    il: true,
    ...(withZmanim ? { location } : {}),
  });

  writeFileSync(join(outDir, file), ics, 'utf8');
  console.log(`✓ ${file} (${events.length} events)`);
}

// הפיד הראשי — זהה לכל הארץ
await build({
  file: 'rega.ics',
  title: 'רגע · לוח עברי',
  caldesc: 'חגים, מועדים, צומות, ראשי חודשים ופרשות השבוע (לוח ארץ ישראל). נוצר על ידי "רגע" — זמן עברי ואזרחי.',
  relcalid: 'rega',
  withZmanim: false,
});

await buildHebrewDates();

// פידים עם זמני שבת לפי עיר
for (const city of CITIES) {
  await build({
    file: `rega-${city.id}.ics`,
    title: `רגע · ${city.name} (עם זמני שבת)`,
    caldesc: `לוח עברי מלא עם הדלקת נרות והבדלה לפי ${city.name}. נוצר על ידי "רגע".`,
    relcalid: `rega-${city.id}`,
    location: new Location(city.lat, city.lon, true, 'Asia/Jerusalem', city.name, 'IL'),
    candleMins: city.candleMins,
    withZmanim: true,
  });
}
console.log('done');
