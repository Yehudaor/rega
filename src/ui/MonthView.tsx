import { HDate } from '@hebcal/core';
import type { Route } from '../App';
import type { City } from '../engine/types';
import { civilMonthGrid, hebrewMonthGrid, type MonthGrid } from '../engine/calendar';

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];

export function MonthView({ route, city }: { route: Extract<Route, { view: 'month' }>; city: City }) {
  let grid: MonthGrid;
  let prevHash: string;
  let nextHash: string;
  let civilHash: string;
  let hebrewHash: string;
  const isHebrew = route.mode === 'hebrew';

  if (route.mode === 'civil') {
    grid = civilMonthGrid(route.y, route.m, city);
    const prev = new Date(route.y, route.m - 1, 1);
    const next = new Date(route.y, route.m + 1, 1);
    prevHash = `#/month/${prev.getFullYear()}-${prev.getMonth() + 1}`;
    nextHash = `#/month/${next.getFullYear()}-${next.getMonth() + 1}`;
    civilHash = `#/month/${route.y}-${route.m + 1}`;
    const mid = new HDate(new Date(route.y, route.m, 15));
    hebrewHash = `#/hmonth/${mid.getFullYear()}-${mid.getMonth()}`;
  } else {
    grid = hebrewMonthGrid(route.hy, route.hm, city);
    const first = new HDate(1, route.hm, route.hy);
    const prevFirst = new HDate(first.abs() - 1);
    const nextFirst = new HDate(first.abs() + first.daysInMonth());
    prevHash = `#/hmonth/${prevFirst.getFullYear()}-${prevFirst.getMonth()}`;
    nextHash = `#/hmonth/${nextFirst.getFullYear()}-${nextFirst.getMonth()}`;
    hebrewHash = `#/hmonth/${route.hy}-${route.hm}`;
    const mid = new HDate(15, route.hm, route.hy).greg();
    civilHash = `#/month/${mid.getFullYear()}-${mid.getMonth() + 1}`;
  }

  return (
    <div className="month-view">
      <div className="month-head">
        <a className="nav-btn" href={prevHash} title="חודש קודם">‹</a>
        <div className="month-titles">
          <h1 className={isHebrew ? 'mt-heb' : 'mt-civil'}>{grid.title}</h1>
          <div className="month-sub">{grid.subtitle}</div>
        </div>
        <a className="nav-btn" href={nextHash} title="חודש הבא">›</a>
      </div>

      <div className="month-toggle">
        <a className={!isHebrew ? 'tg active' : 'tg'} href={civilHash}>לוח אזרחי</a>
        <a className={isHebrew ? 'tg active' : 'tg'} href={hebrewHash}>לוח עברי</a>
      </div>

      <div className="month-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="wd">{w}</div>
        ))}
        {grid.cells.map((c) => (
          <a
            key={c.iso}
            href={`#/day/${c.iso}`}
            className={[
              'cell',
              c.inMonth ? '' : 'dim',
              c.isToday ? 'today' : '',
              c.isShabbat ? 'shabbat-col' : '',
            ].join(' ')}
          >
            <div className="cell-nums">
              <span className={isHebrew ? 'num-sec' : 'num-main'}>{c.civilDay}</span>
              <span className={isHebrew ? 'num-main heb' : 'num-sec heb'}>{c.hebDay}</span>
            </div>
            <div className="cell-labels">
              {c.labels.slice(0, 2).map((l, i) => (
                <span key={i} className={`cl kb-text-${l.kind}`}>{l.title}</span>
              ))}
              {c.labels.length > 2 && <span className="cl more">+{c.labels.length - 2}</span>}
            </div>
            <div className="cell-times" dir="ltr">
              {c.candle && <span title="הדלקת נרות">🕯 {c.candle}</span>}
              {c.havdala && <span title="צאת השבת">✦ {c.havdala}</span>}
            </div>
          </a>
        ))}
      </div>
      <p className="muted small center">היום העברי מתחיל בערב הקודם, בשקיעה — לכן כל תא מציג את היום העברי של שעות האור.</p>
    </div>
  );
}
