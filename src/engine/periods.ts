import { HDate, months } from '@hebcal/core';
import type { Layer } from './types';

/**
 * תקופות מתמשכות בלוח — שכבות שקטות שמלוות ימים רבים.
 * מחושבות ישירות מהתאריך העברי, לא מטבלה.
 */
export function activePeriods(hd: HDate): Layer[] {
  const layers: Layer[] = [];
  const y = hd.getFullYear();
  const abs = hd.abs();
  const between = (a: HDate, b: HDate) => abs >= a.abs() && abs <= b.abs();

  // בין המצרים: י"ז בתמוז עד ט' באב
  if (between(new HDate(17, months.TAMUZ, y), new HDate(9, months.AV, y))) {
    const nine = hd.getMonth() === months.AV;
    layers.push({
      id: nine ? 'nine-days' : 'bein-hametzarim',
      title: nine ? 'תשעת הימים' : 'בין המצרים (שלושת השבועות)',
      kind: 'period',
      rank: 30,
      contentId: 'bein-hametzarim',
      detail: nine
        ? 'ימי האבל המחמירים שמראש חודש אב ועד הצום'
        : 'ימי אבלות על החורבן, מי"ז בתמוז עד ט׳ באב',
    });
  }

  // י' באב — זנב מנהגי האבלות עד חצות
  if (hd.getMonth() === months.AV && hd.getDate() === 10) {
    layers.push({
      id: 'tenth-av',
      title: 'מוצאי תשעה באב',
      kind: 'period',
      rank: 45,
      contentId: 'bein-hametzarim',
      detail: 'נהגו להימנע מבשר ויין עד חצות היום — המקדש המשיך לבעור בי׳ באב',
    });
  }

  // ספירת העומר: ט"ז בניסן עד ה' בסיוון (49 ימים)
  const omerStart = new HDate(16, months.NISAN, y);
  const omerDay = abs - omerStart.abs() + 1;
  if (omerDay >= 1 && omerDay <= 49) {
    layers.push({
      id: 'omer',
      title: `ספירת העומר — יום ${omerDay}`,
      kind: 'omer',
      rank: 60,
      detail: 'הספירה נאמרת בלילה, בתחילת היום העברי',
    });
  }

  // אלול — חודש התשובה
  if (hd.getMonth() === months.ELUL) {
    layers.push({
      id: 'elul',
      title: 'חודש אלול',
      kind: 'period',
      rank: 30,
      contentId: 'elul',
      detail: 'חודש של חשבון נפש והכנה לימים הנוראים',
    });
  }

  // עשרת ימי תשובה: א'–י' בתשרי
  if (hd.getMonth() === months.TISHREI && hd.getDate() <= 10) {
    layers.push({
      id: 'aseret-yemei-teshuva',
      title: 'עשרת ימי תשובה',
      kind: 'period',
      rank: 35,
      contentId: 'aseret-yemei-teshuva',
      detail: 'מראש השנה עד יום הכיפורים; תוספות בתפילה',
    });
  }

  return layers;
}
