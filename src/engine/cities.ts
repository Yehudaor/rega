import type { City } from './types';

/**
 * דקות הדלקת נרות: ירושלים 40, חיפה 30, שאר הערים 20 (הנחת ברירת מחדל,
 * לוחות שונים נוהגים 18–30; ניתן להתאמה בהגדרות בהמשך).
 */
export const CITIES: City[] = [
  { id: 'jerusalem',   name: 'ירושלים',    lat: 31.778, lon: 35.235, elev: 754, candleMins: 40 },
  { id: 'tel-aviv',    name: 'תל אביב',    lat: 32.087, lon: 34.791, elev: 15,  candleMins: 20 },
  { id: 'haifa',       name: 'חיפה',       lat: 32.794, lon: 34.989, elev: 100, candleMins: 30 },
  { id: 'beer-sheva',  name: 'באר שבע',    lat: 31.252, lon: 34.791, elev: 260, candleMins: 20 },
  { id: 'ashdod',      name: 'אשדוד',      lat: 31.804, lon: 34.655, elev: 30,  candleMins: 20 },
  { id: 'netanya',     name: 'נתניה',      lat: 32.321, lon: 34.853, elev: 20,  candleMins: 20 },
  { id: 'bnei-brak',   name: 'בני ברק',    lat: 32.084, lon: 34.833, elev: 20,  candleMins: 20 },
  { id: 'petah-tikva', name: 'פתח תקווה',  lat: 32.089, lon: 34.886, elev: 30,  candleMins: 20 },
  { id: 'modiin',      name: 'מודיעין',    lat: 31.898, lon: 35.010, elev: 280, candleMins: 20 },
  { id: 'rehovot',     name: 'רחובות',     lat: 31.894, lon: 34.811, elev: 60,  candleMins: 20 },
  { id: 'tzfat',       name: 'צפת',        lat: 32.965, lon: 35.496, elev: 850, candleMins: 20 },
  { id: 'tiberias',    name: 'טבריה',      lat: 32.789, lon: 35.531, elev: -200, candleMins: 20 },
  { id: 'eilat',       name: 'אילת',       lat: 29.558, lon: 34.948, elev: 10,  candleMins: 20 },
];

export const DEFAULT_CITY_ID = 'jerusalem';

export function findCity(id: string): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

export function nearestCity(lat: number, lon: number): City {
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
