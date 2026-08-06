/**
 * חישוב כיוון התפילה — אזימוט מעגל גדול אל מקום המקדש.
 * היעד: אבן השתייה שבהר הבית (כיפת הסלע) — המקום שאליו מכוונים את הלב.
 */
export const TEMPLE = { lat: 31.7781, lon: 35.2354, name: 'הר הבית' };

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** אזימוט התחלתי (0=צפון, 90=מזרח) מנקודה אל היעד */
export function bearingTo(lat: number, lon: number, t = TEMPLE): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(t.lat);
  const Δλ = toRad(t.lon - lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** מרחק בקילומטרים (הוורסין) */
export function distanceTo(lat: number, lon: number, t = TEMPLE): number {
  const R = 6371;
  const dφ = toRad(t.lat - lat);
  const dλ = toRad(t.lon - lon);
  const a =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(t.lat)) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "צפון־מזרח" וכדומה, לפי אזימוט */
export function compassWord(deg: number): string {
  const names = [
    'צפון', 'צפון־צפון־מזרח', 'צפון־מזרח', 'מזרח־צפון־מזרח',
    'מזרח', 'מזרח־דרום־מזרח', 'דרום־מזרח', 'דרום־דרום־מזרח',
    'דרום', 'דרום־דרום־מערב', 'דרום־מערב', 'מערב־דרום־מערב',
    'מערב', 'מערב־צפון־מערב', 'צפון־מערב', 'צפון־צפון־מערב',
  ];
  return names[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}
