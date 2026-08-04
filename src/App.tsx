import { useEffect, useMemo, useState } from 'react';
import './content'; // רישום עמודי התוכן במנוע — חייב לרוץ לפני חישוב snapshot
import { makeSnapshot } from './engine/moment';
import { CITIES, DEFAULT_CITY_ID, findCity, nearestCity } from './engine/cities';
import type { City, Minhag } from './engine/types';
import { NowScreen } from './ui/NowScreen';
import { MonthView } from './ui/MonthView';
import { DayView } from './ui/DayView';
import { EventPage } from './ui/EventPage';

// מצב בדיקה: ?t=2026-07-22T21:00 מדמה זמן אחר (השעון ממשיך לרוץ מאותה נקודה)
const timeOverride = (() => {
  const t = new URLSearchParams(location.search).get('t');
  if (!t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : { base: d.getTime(), loaded: Date.now() };
})();

function realNow(): Date {
  return timeOverride
    ? new Date(timeOverride.base + (Date.now() - timeOverride.loaded))
    : new Date();
}

export type Route =
  | { view: 'now' }
  | { view: 'month'; mode: 'civil'; y: number; m: number }
  | { view: 'month'; mode: 'hebrew'; hy: number; hm: number }
  | { view: 'day'; iso: string }
  | { view: 'event'; id: string; iso?: string };

function parseHash(): Route {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!parts.length) return { view: 'now' };
  if (parts[0] === 'month') {
    if (parts[1]) {
      const [y, m] = parts[1].split('-').map(Number);
      if (y && m) return { view: 'month', mode: 'civil', y, m: m - 1 };
    }
    const d = new Date();
    return { view: 'month', mode: 'civil', y: d.getFullYear(), m: d.getMonth() };
  }
  if (parts[0] === 'hmonth' && parts[1]) {
    const [hy, hm] = parts[1].split('-').map(Number);
    if (hy && hm) return { view: 'month', mode: 'hebrew', hy, hm };
  }
  if (parts[0] === 'day' && parts[1]) return { view: 'day', iso: parts[1] };
  if (parts[0] === 'event' && parts[1]) {
    return { view: 'event', id: decodeURIComponent(parts[1]), iso: parts[2] };
  }
  return { view: 'now' };
}

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

function useMinhag(): [Minhag, (m: Minhag) => void] {
  const [minhag, setMinhagState] = useState<Minhag>(() => {
    try {
      const v = localStorage.getItem('rega-minhag');
      return v === 'ashkenaz' || v === 'sefard' ? v : 'all';
    } catch {
      return 'all';
    }
  });
  const set = (m: Minhag) => {
    setMinhagState(m);
    try { localStorage.setItem('rega-minhag', m); } catch { /* private mode */ }
  };
  return [minhag, set];
}

const MINHAG_LABEL: Record<Minhag, string> = {
  all: 'להציג את כל המנהגים',
  ashkenaz: 'אשכנז',
  sefard: 'ספרד ועדות המזרח',
};

function useCity(): [City, (id: string) => void] {
  const [cityId, setCityId] = useState<string>(() => {
    try {
      return localStorage.getItem('rega-city') ?? DEFAULT_CITY_ID;
    } catch {
      return DEFAULT_CITY_ID;
    }
  });
  const set = (id: string) => {
    setCityId(id);
    try {
      localStorage.setItem('rega-city', id);
    } catch { /* private mode */ }
  };
  return [findCity(cityId), set];
}

export function App() {
  const route = useRoute();
  const [city, setCityId] = useCity();
  const [minhag, setMinhag] = useMinhag();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [onboarded, setOnboardedState] = useState<boolean>(() => {
    try { return localStorage.getItem('rega-onboarded') === '1'; } catch { return true; }
  });
  const finishOnboarding = () => {
    setOnboardedState(true);
    try { localStorage.setItem('rega-onboarded', '1'); } catch { /* private mode */ }
  };
  const [now, setNow] = useState(() => realNow());

  // כתובת פיד היומן של העיר הנבחרת — עובדת גם מקומית וגם באתר המפורסם
  const icsUrl =
    location.origin + location.pathname.replace(/[^/]*$/, '') + `rega-${city.id}.ics`;

  useEffect(() => {
    const t = setInterval(() => setNow(realNow()), 1000);
    return () => clearInterval(t);
  }, []);

  // חישוב snapshot כל 15 שניות (או כשמחליפים עיר) — השעון עצמו מתעדכן כל שנייה
  const snapKey = Math.floor(now.getTime() / 15_000);
  const snap = useMemo(() => makeSnapshot(realNow(), city), [snapKey, city.id]);

  const isNow = route.view === 'now';
  const isMonth = route.view === 'month';

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="brand-mark">רגע</span>
          <span className="brand-sub">זמן עברי ואזרחי</span>
        </a>
        <nav className="tabs">
          <a className={isNow ? 'tab active' : 'tab'} href="#/">עכשיו</a>
          <a className={isMonth ? 'tab active' : 'tab'} href="#/month">חודש</a>
        </nav>
        <button className="city-btn" onClick={() => setSettingsOpen(true)} title="מיקום">
          📍 {city.name}
        </button>
      </header>

      <main className="main">
        {route.view === 'now' && <NowScreen snap={snap} now={now} />}
        {route.view === 'month' && <MonthView route={route} city={city} />}
        {route.view === 'day' && <DayView iso={route.iso} city={city} />}
        {route.view === 'event' && (
          <EventPage id={route.id} iso={route.iso} city={city} snap={snap} minhag={minhag} />
        )}
      </main>

      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>מיקום</h2>
            <p className="muted">
              זמני היום — שקיעה, צאת הכוכבים, עלות השחר — מחושבים לפי המקום שבחרת.
            </p>
            <select
              value={city.id}
              onChange={(e) => setCityId(e.target.value)}
              className="city-select"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              className="btn-secondary"
              onClick={() => {
                navigator.geolocation?.getCurrentPosition(
                  (pos) => {
                    const c = nearestCity(pos.coords.latitude, pos.coords.longitude);
                    setCityId(c.id);
                  },
                  () => { /* המשתמש סירב — נשארים בעיר הנוכחית */ },
                );
              }}
            >
              אתר אותי אוטומטית
            </button>
            <p className="muted small">
              הדלקת נרות: ירושלים 40 דק׳ לפני השקיעה, חיפה 30, שאר הערים 20 (ניתן יהיה להתאמה).
            </p>

            <hr className="modal-sep" />
            <h2>מנהג</h2>
            <p className="muted small">
              קובע איזה מנהג מודגש בעמודי המועדים. שום מידע לא נמחק — מנהגים אחרים מוצגים תחת "מנהג אחר".
            </p>
            <select
              value={minhag}
              onChange={(e) => setMinhag(e.target.value as Minhag)}
              className="city-select"
            >
              {(Object.keys(MINHAG_LABEL) as Minhag[]).map((m) => (
                <option key={m} value={m}>{MINHAG_LABEL[m]}</option>
              ))}
            </select>

            <hr className="modal-sep" />
            <h2>חיבור ליומן גוגל / אפל</h2>
            <p className="muted small">
              הירשמו לפיד ולוח "רגע" יופיע כלוח־משנה בתוך היומן הקיים שלכם — שבתות, חגים,
              צומות, ראשי חודשים ופרשות ({city.name}), ארבע שנים קדימה, לצד האירועים הרגילים.
            </p>
            <div className="ics-row" dir="ltr">
              <input className="ics-url" readOnly value={icsUrl} onFocus={(e) => e.currentTarget.select()} />
              <button
                className="btn-secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(icsUrl).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? '✓ הועתק' : 'העתקה'}
              </button>
            </div>
            <ul className="ics-help muted small">
              <li><b>גוגל</b> (במחשב): הגדרות ← הוספת יומן ← מכתובת URL ← הדביקו את הקישור.</li>
              <li><b>אייפון</b>: הגדרות ← לוח שנה ← חשבונות ← הוספת חשבון ← אחר ← הוספת מינוי ללוח שנה.</li>
              <li><b>מק</b>: לוח שנה ← קובץ ← מינוי לוח שנה חדש.</li>
              <li>למניעת כפילויות: אם מופעל אצלכם יומן "חגים יהודיים" המובנה של גוגל — כדאי לכבותו.</li>
            </ul>

            <button className="btn-primary" onClick={() => setSettingsOpen(false)}>סגירה</button>
          </div>
        </div>
      )}

      {!onboarded && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>ברוכים הבאים לרגע</h2>
            <p className="muted">
              רגע מציג יחד את הזמן העברי והאזרחי — מה עכשיו, מה חשוב עכשיו ומה המעבר הבא.
              שתי בחירות קצרות, ואפשר לשנות אותן בכל רגע בהגדרות (📍).
            </p>
            <label className="ob-label">המיקום שלי — לחישוב זמני היום</label>
            <select
              value={city.id}
              onChange={(e) => setCityId(e.target.value)}
              className="city-select"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label className="ob-label">המנהג שלי — מה יודגש בעמודי המועדים</label>
            <div className="ob-choices">
              {(['all', 'sefard', 'ashkenaz'] as Minhag[]).map((m) => (
                <button
                  key={m}
                  className={minhag === m ? 'ob-choice active' : 'ob-choice'}
                  onClick={() => setMinhag(m)}
                >
                  {MINHAG_LABEL[m]}
                </button>
              ))}
            </div>
            <p className="muted small">שום מידע לא מוסתר — מנהגים אחרים פשוט מוצגים בשקט, בצד.</p>
            <button className="btn-primary" onClick={finishOnboarding}>מתחילים</button>
          </div>
        </div>
      )}

      <footer className="foot">
        <span>הזמנים מחושבים מקומית לפי {city.name} · הלוח מחושב, לא מוקלד</span>
        {timeOverride && <span className="debug-time"> · ⚠ מצב בדיקה: זמן מדומה</span>}
      </footer>
    </div>
  );
}
