import { useEffect, useRef, useState } from 'react';
import type { City } from '../engine/types';
import { bearingTo, compassWord, distanceTo, TEMPLE } from '../engine/bearing';
import { Card, TagBadge } from './bits';

type Pos = { lat: number; lon: number; source: 'gps' | 'city' };

/** אירוע כיוון עם השדה הלא־תקני של ספארי */
type OrientEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };
type PermissionCapable = { requestPermission?: () => Promise<'granted' | 'denied'> };

const ROSE = [
  { deg: 0, label: 'צ' },
  { deg: 90, label: 'מז' },
  { deg: 180, label: 'ד' },
  { deg: 270, label: 'מע' },
];

/** היסטרזיס: נכנסים למצב "מכוון" ב־5°, יוצאים רק ב־12° — כדי שרעד קטן לא ירטיט שוב ושוב */
const ALIGN_IN = 5;
const ALIGN_OUT = 12;

/** הפרש זוויתי מזערי ל־[-180,180] */
function signedDelta(deg: number): number {
  return ((deg % 360) + 540) % 360 - 180;
}

export function CompassView({ city }: { city: City }) {
  const [pos, setPos] = useState<Pos>({ lat: city.lat, lon: city.lon, source: 'city' });
  const [heading, setHeading] = useState<number | null>(null);
  const [sensorState, setSensorState] = useState<'idle' | 'on' | 'denied' | 'unsupported'>('idle');
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [aligned, setAligned] = useState(false);
  const listening = useRef(false);
  const alignedRef = useRef(false);
  const headingRef = useRef<number | null>(null);

  const bearing = bearingTo(pos.lat, pos.lon);
  const distance = distanceTo(pos.lat, pos.lon);
  const atTemple = pos.source === 'gps' && distance < 0.3;
  const tooCloseToTell = pos.source === 'city' && distance < 2;

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude, source: 'gps' }),
      () => setGeoNote('לא התקבלה הרשאת מיקום — הכיוון מחושב לפי ' + city.name),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [city.id]);

  function onOrient(e: Event) {
    const ev = e as OrientEvent;
    let h: number | null = null;
    if (typeof ev.webkitCompassHeading === 'number') {
      h = ev.webkitCompassHeading; // ספארי: כבר מעלות מהצפון
    } else if (ev.absolute && typeof ev.alpha === 'number') {
      h = (360 - ev.alpha) % 360;
    }
    // כיוון יחסי בלבד (בלי absolute) חסר משמעות כמצפן — מתעלמים
    if (h === null) return;
    headingRef.current = h;
    setHeading(h);
  }

  async function enableCompass() {
    const DOE = window.DeviceOrientationEvent as unknown as PermissionCapable | undefined;
    if (!DOE) {
      setSensorState('unsupported');
      return;
    }
    // אייפון דורש בקשת הרשאה מפורשת, ורק מתוך לחיצה של המשתמש
    if (typeof DOE.requestPermission === 'function') {
      try {
        if ((await DOE.requestPermission()) !== 'granted') {
          setSensorState('denied');
          return;
        }
      } catch {
        setSensorState('denied');
        return;
      }
    }
    if (!listening.current) {
      window.addEventListener('deviceorientationabsolute', onOrient);
      window.addEventListener('deviceorientation', onOrient);
      listening.current = true;
    }
    setSensorState('on');
    // אם לא הגיע כיוון מוחלט תוך שלוש שניות — אין כאן מצפן אמיתי
    setTimeout(() => {
      if (headingRef.current === null) setSensorState('unsupported');
    }, 3000);
  }

  useEffect(
    () => () => {
      window.removeEventListener('deviceorientationabsolute', onOrient);
      window.removeEventListener('deviceorientation', onOrient);
    },
    [],
  );

  const live = sensorState === 'on' && heading !== null;
  const offset = live ? signedDelta(bearing - heading!) : signedDelta(bearing);

  // מעבר למצב "מכוון": רטט פעם אחת בכניסה, ולא בכל רעד
  useEffect(() => {
    if (!live || atTemple) return;
    const off = Math.abs(offset);
    if (!alignedRef.current && off <= ALIGN_IN) {
      alignedRef.current = true;
      setAligned(true);
      navigator.vibrate?.(60);
    } else if (alignedRef.current && off >= ALIGN_OUT) {
      alignedRef.current = false;
      setAligned(false);
    }
  }, [offset, live, atTemple]);

  const roseRot = live ? -heading! : 0;
  const showAligned = live && aligned;

  return (
    <div className="compass-view">
      <h1 className="connect-title">כיוון התפילה</h1>

      <Card className={`compass-card ${showAligned ? 'aligned' : ''}`}>
        <div className="compass-wrap">
          <div className="compass-pointer" aria-hidden="true">▼</div>
          <svg viewBox="0 0 240 240" className="compass-dial" role="img"
               aria-label={`כיוון מקום המקדש: ${Math.round(bearing)} מעלות`}>
            <g style={{ transform: `rotate(${roseRot}deg)`, transformOrigin: '120px 120px' }}>
              <circle cx="120" cy="120" r="108" className="dial-ring" />
              {Array.from({ length: 72 }, (_, i) => {
                const major = i % 6 === 0;
                return (
                  <line
                    key={i}
                    x1="120" y1={major ? 15 : 19} x2="120" y2={major ? 27 : 24}
                    className={major ? 'tick major' : 'tick'}
                    style={{ transform: `rotate(${i * 5}deg)`, transformOrigin: '120px 120px' }}
                  />
                );
              })}
              {ROSE.map((r) => (
                <text
                  key={r.deg} x="120" y="45" className={`rose-label ${r.deg === 0 ? 'north' : ''}`}
                  style={{ transform: `rotate(${r.deg}deg)`, transformOrigin: '120px 120px' }}
                >
                  {r.label}
                </text>
              ))}
              {/* המחוג אל מקום המקדש */}
              <g style={{ transform: `rotate(${bearing}deg)`, transformOrigin: '120px 120px' }}>
                <line x1="120" y1="126" x2="120" y2="62" className="needle" />
                <polygon points="120,36 105,68 135,68" className="needle-head" />
              </g>
            </g>
            <circle cx="120" cy="120" r="9" className="needle-hub" />
          </svg>
        </div>

        <div className="compass-readout">
          {atTemple ? (
            <div className="compass-here">אתם בסמוך למקום המקדש</div>
          ) : tooCloseToTell ? (
            <div className="compass-here">בחרתם ירושלים — אשרו מיקום מדויק לכיוון אמיתי</div>
          ) : showAligned ? (
            <div className="compass-ok">אתה מכוון</div>
          ) : (
            <>
              <div className="compass-deg" dir="ltr">{Math.round(bearing)}°</div>
              <div className="compass-word">{compassWord(bearing)}</div>
              <div className="compass-dist">
                {distance < 1
                  ? `${Math.round(distance * 1000)} מטר מ${TEMPLE.name}`
                  : `${distance.toLocaleString('he-IL', { maximumFractionDigits: distance < 100 ? 1 : 0 })} ק״מ מ${TEMPLE.name}`}
              </div>
            </>
          )}
        </div>

        {sensorState !== 'on' && (
          <button className="btn-primary compass-btn" onClick={enableCompass}>
            הפעלת המצפן החי
          </button>
        )}

        <p className="compass-note">
          הכיוון מחושב אל מקום המקדש בירושלים, מהמיקום שלכם.
        </p>

        {sensorState === 'idle' && (
          <p className="muted small center">בלי הפעלה, המחוג מוצג ביחס לצפון.</p>
        )}
        {sensorState === 'denied' && (
          <p className="muted small center">ההרשאה לחיישן הכיוון נדחתה — המחוג מוצג ביחס לצפון.</p>
        )}
        {sensorState === 'unsupported' && (
          <p className="muted small center">אין כאן חיישן מצפן — המחוג מוצג ביחס לצפון.</p>
        )}
        {geoNote && <p className="muted small center">{geoNote}</p>}
      </Card>

      <details className="big-sec">
        <summary>לאן בדיוק מכוונים</summary>
        <div className="content-sub">
          <ul className="blocks">
            <li><TagBadge tag="דין" /><span>העומד בחוץ לארץ מכוון פניו לארץ ישראל ולבו לירושלים, למקום המקדש ולקודש הקודשים.</span></li>
            <li><TagBadge tag="דין" /><span>העומד בארץ ישראל מכוון פניו לירושלים, ולבו למקום המקדש ולקודש הקודשים.</span></li>
            <li><TagBadge tag="דין" /><span>העומד בירושלים מכוון פניו למקום המקדש, ולבו לקודש הקודשים.</span></li>
            <li><TagBadge tag="הערה" /><span>לכן היעד כאן הוא הר הבית ולא מרכז העיר, והזווית מחושבת מהמיקום המדויק שלכם — מנתניה, למשל, הכיוון הוא 149° ולא מזרח.</span></li>
            <li><TagBadge tag="בימינו" /><span>חיישן המצפן מושפע ממתכת וממכשירי חשמל. אם המחוג קופץ — התרחקו ממקור ההפרעה וכיילו בתנועת שמינייה.</span></li>
            <li><TagBadge tag="הערה" /><span>אין צורך בדיוק של מעלות: ההלכה מדברת על כיוון כללי, ומי שאינו יודע לכוון — מכוון את לבו לאביו שבשמיים.</span></li>
          </ul>
        </div>
      </details>

      <details className="big-sec">
        <summary>מקורות</summary>
        <ul className="sources">
          <li><b>תלמוד בבלי</b> — ברכות ל ע״א</li>
          <li><b>שולחן ערוך</b> — אורח חיים, סימן צ״ד</li>
          <li><b>פניני הלכה</b> — תפילה, פרק יז: תפילת עמידה</li>
        </ul>
      </details>
    </div>
  );
}
