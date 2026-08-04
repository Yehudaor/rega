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

const pages: EventContent[] = [
  tishaBav,
  beinHametzarim,
  shabbat,
  shabbatNachamu,
  roshChodesh,
  tuBav,
  elul,
  parsha,
];

const registry = new Map(pages.map((p) => [p.id, p]));

// מיידע את המנוע אילו עמודי תוכן קיימים (לקישור שכבות → עמודים)
registerContentIds([...registry.keys()]);

export function getContent(id: string): EventContent | undefined {
  return registry.get(id);
}

export const contentIds = [...registry.keys()];
