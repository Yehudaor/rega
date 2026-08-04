import type { EventContent } from './model';
import { registerContentIds } from '../engine/layers';
import { tishaBav } from './tisha-bav';
import { beinHametzarim } from './bein-hametzarim';
import { shabbat } from './shabbat';
import { shabbatNachamu } from './shabbat-nachamu';
import { roshChodesh } from './rosh-chodesh';
import { tuBav } from './tu-bav';
import { elul } from './elul';
import { parsha } from './parsha';
import { roshHashana } from './rosh-hashana';
import { yomKippur } from './yom-kippur';
import { aseretYemeiTeshuva } from './aseret-yemei-teshuva';
import { sukkot } from './sukkot';
import { shminiAtzeret } from './shmini-atzeret';
import { chanukah } from './chanukah';

const pages: EventContent[] = [
  tishaBav,
  beinHametzarim,
  shabbat,
  shabbatNachamu,
  roshChodesh,
  tuBav,
  elul,
  parsha,
  roshHashana,
  yomKippur,
  aseretYemeiTeshuva,
  sukkot,
  shminiAtzeret,
  chanukah,
];

const registry = new Map(pages.map((p) => [p.id, p]));

/** שמות נוספים שמצביעים על אותו עמוד (בארץ שמחת תורה ושמיני עצרת הם יום אחד) */
const ALIASES: Record<string, string> = {
  'simchat-torah': 'shmini-atzeret',
  'sukkot-chm': 'sukkot',
  'hoshana-raba': 'sukkot',
};

// מיידע את המנוע אילו עמודי תוכן קיימים (לקישור שכבות → עמודים)
registerContentIds([...registry.keys(), ...Object.keys(ALIASES)]);

export function getContent(id: string): EventContent | undefined {
  return registry.get(id) ?? registry.get(ALIASES[id]);
}

export const contentIds = [...registry.keys()];
