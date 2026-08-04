/**
 * מחולל פידי iCal — קובץ לכל עיר, מהיום ועד 4 שנים קדימה.
 * רץ אוטומטית לפני build (סקריפט prebuild) וכותב אל public/.
 * ההרשמה: גוגל — "הוספת יומן מכתובת URL"; אפל — "מנוי ליומן חדש".
 *
 * הערה: רשימת הערים משוכפלת מ־src/engine/cities.ts — לשמור מסונכרן.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HebrewCalendar, Location } from '@hebcal/core';
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

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(outDir, { recursive: true });

const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), 1);
const end = new Date(now.getFullYear() + 4, now.getMonth(), 1);

for (const city of CITIES) {
  const location = new Location(city.lat, city.lon, true, 'Asia/Jerusalem', city.name, 'IL');
  const events = HebrewCalendar.calendar({
    start,
    end,
    il: true,
    sedrot: true,
    candlelighting: true,
    candleLightingMins: city.candleMins,
    havdalahDeg: 8.5,
    location,
    locale: 'he-x-NoNikud',
    yomKippurKatan: false,
    molad: false,
  });

  const ics = await eventsToIcalendar(events, {
    title: `רגע · ${city.name}`,
    caldesc: `זמנים עבריים לפי ${city.name}: שבתות, חגים, צומות, ראשי חודשים ופרשות. נוצר על ידי "רגע" — זמן עברי ואזרחי.`,
    prodid: `-//rega//iCal ${city.id}//HE`,
    relcalid: `rega-${city.id}`,
    locale: 'he-x-NoNikud',
    location,
    il: true,
  });

  writeFileSync(join(outDir, `rega-${city.id}.ics`), ics, 'utf8');
  console.log(`✓ rega-${city.id}.ics (${events.length} events)`);
}
console.log('done');
