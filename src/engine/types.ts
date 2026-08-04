import type { HDate } from '@hebcal/core';

/** סוגי שכבות זמן — קובעים דירוג, צבע ותווית */
export type LayerKind =
  | 'major-fast'
  | 'chag'
  | 'chol-hamoed'
  | 'shabbat'
  | 'minor-fast'
  | 'chanukah'
  | 'purim'
  | 'rosh-chodesh'
  | 'special-shabbat'
  | 'omer'
  | 'memorial'
  | 'modern'
  | 'minor'
  | 'period'
  | 'parsha';

/** העדפת מנהג — משפיעה על סדר והדגשה של תוכן, לא מסתירה כלום */
export type Minhag = 'ashkenaz' | 'sefard' | 'all';

export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elev: number;
  /** דקות הדלקת נרות לפני שקיעה (ירושלים 40, חיפה 30, ברירת מחדל 20) */
  candleMins: number;
}

export interface DayZmanim {
  alot: Date;
  misheyakir: Date;
  sunrise: Date;
  sofShma: Date;
  sofTfilla: Date;
  chatzot: Date;
  minchaGedola: Date;
  minchaKetana: Date;
  plag: Date;
  sunset: Date;
  tzeit: Date;
  chatzotNight: Date;
}

/** שלב ביום — לפי זמני המקום */
export type PhaseKey =
  | 'lateNight'      // חצות הלילה עד עלות השחר
  | 'dawn'           // עלות השחר עד הנץ
  | 'morning'        // הנץ עד חצות היום
  | 'afternoon'      // חצות עד שקיעה
  | 'beinHashmashot' // שקיעה עד צאת הכוכבים
  | 'night';         // צאת הכוכבים עד חצות הלילה

export interface Layer {
  id: string;
  title: string;
  kind: LayerKind;
  rank: number;
  /** שורת פירוט קצרה, כבר עם זמנים אם רלוונטי */
  detail?: string;
  contentId?: string;
  /** האם השכבה פעילה ממש ברגע זה (למשל צום שכבר התחיל) */
  activeNow?: boolean;
  window?: { start: Date; end: Date };
  /** תאריך אזרחי (ISO) של מופע האירוע — לקישור לעמוד; ברירת מחדל: היום */
  iso?: string;
}

export interface Transition {
  time: Date;
  label: string;
  /** ככל שגבוה יותר — משמעותי יותר להצגה כ"מעבר הבא" */
  priority: number;
}

export interface UpcomingItem {
  date: Date;
  hd: HDate;
  title: string;
  kind: LayerKind;
  contentId?: string;
  dateStr: string;
  hdStr: string;
}

export interface Snapshot {
  now: Date;
  city: City;
  zmanim: DayZmanim;
  civil: {
    dateStr: string;   // "יום רביעי, 22 ביולי 2026"
    iso: string;       // "2026-07-22"
  };
  hebrew: {
    hd: HDate;             // התאריך העברי האפקטיבי (מתקדם בשקיעה)
    dateStr: string;       // "ט׳ באב תשפ״ו"
    displayName: string;   // "ליל ט׳ באב" / "ט׳ באב"
    changedAtSunset: boolean;
    boundaryNote: string;  // הסבר קצר על מצב הגבול בין הימים
  };
  phase: { key: PhaseKey; label: string };
  isBeinHashmashot: boolean;
  layers: Layer[];
  motzaeiNote?: string;
  heroTransition?: Transition;
  nextTransitions: Transition[];
  upcoming: UpcomingItem[];
}
