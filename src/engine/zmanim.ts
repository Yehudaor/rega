import { GeoLocation, Zmanim } from '@hebcal/core';
import type { City, DayZmanim } from './types';

const glocCache = new Map<string, GeoLocation>();

function geo(city: City): GeoLocation {
  let g = glocCache.get(city.id);
  if (!g) {
    g = new GeoLocation(city.name, city.lat, city.lon, Math.max(0, city.elev), 'Asia/Jerusalem');
    glocCache.set(city.id, g);
  }
  return g;
}

const zCache = new Map<string, DayZmanim>();

/** זמני היום לתאריך אזרחי נתון (לפי חצות־עד־חצות אזרחי) */
export function dayZmanim(date: Date, city: City): DayZmanim {
  const key = `${city.id}|${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const cached = zCache.get(key);
  if (cached) return cached;
  // useElevation=false — הזמנים המקובלים בלוחות בישראל מחושבים לגובה פני הים
  const z = new Zmanim(geo(city), date, false);
  const sunset = z.sunset();
  const result: DayZmanim = {
    alot: z.alotHaShachar(),
    misheyakir: z.misheyakir(),
    sunrise: z.sunrise(),
    sofShma: z.sofZmanShma(),
    sofTfilla: z.sofZmanTfilla(),
    chatzot: z.chatzot(),
    minchaGedola: z.minchaGedola(),
    minchaKetana: z.minchaKetana(),
    plag: z.plagHaMincha(),
    sunset,
    tzeit: z.tzeit(8.5),
    tzeitRT: new Date(sunset.getTime() + 72 * 60_000),
    chatzotNight: z.chatzotNight(),
  };
  if (zCache.size > 400) zCache.clear();
  zCache.set(key, result);
  return result;
}

/** הדלקת נרות: שקיעה פחות דקות העיר */
export function candleLighting(date: Date, city: City): Date {
  const z = dayZmanim(date, city);
  return new Date(z.sunset.getTime() - city.candleMins * 60_000);
}
