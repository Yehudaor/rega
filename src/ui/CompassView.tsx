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

export function CompassView({ city }: { city: City }) {
  const [pos, setPos] = useState<Pos>({ lat: city.lat, lon: city.lon, source: 'city' });
  const [heading, setHeading] = useState<number | null>(null);
  const [sensorState, setSensorState] = useState<'idle' | 'on' | 'denied' | 'unsupported'>('idle');
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const listening = useRef(false);

  const bearing = bearingTo(pos.lat, pos.lon);
  const distance = distanceTo(pos.lat, pos.lon);
  // "אתם כאן" רק על סמך מיקום מדויק — קואורדינטת ירושלים היא בעצמה הר הבית
  const atTemple = pos.source === 'gps' && distance < 0.3;
  const tooCloseToTell = pos.source === 'city' && distance < 2;

  // מיקום מדויק — משפר את הדיוק, אך יש ברירת מחדל לפי העיר שנבחרה
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
    if (typeof ev.webkitCompassHeading === 'number') {
      setHeading(ev.webkitCompassHeading); // ספארי: כבר מעלות מהצפון
    } else if (ev.absolute && typeof ev.alpha === 'number') {
      setHeading((360 - ev.alpha) % 360);
    }
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
        const res = await DOE.requestPermission();
        if (res !== 'granted') {
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
  }

  useEffect(
    () => () => {
      window.removeEventListener('deviceorientationabsolute', onOrient);
      window.removeEventListener('deviceorientation', onOrient);
    },
    [],
  );

  const live = sensorState === 'on' && heading !== null;
  const roseRot = live ? -heading! : 0;
  const markerAngle = live ? bearing - heading! : bearing;
  const aligned = live && Math.abs(((markerAngle + 540) % 360) - 180) > 172;

  return (
    <div className="compass-view">
      <h1 className="connect-title">כיוון התפילה</h1>
      <p className="connect-intro">
        בתפילת העמידה מכוונים את הפנים לירושלים ואת הלב למקום המקדש וקודש הקודשים.
        המצפן מראה את הכיוון מהמקום שבו אתם נמצאים.
      </p>

      <Card className={`compass-card ${aligned ? 'aligned' : ''}`}>
        <div className="compass-wrap">
          <div className="compass-pointer" aria-hidden="true">▼</div>
          <svg viewBox="0 0 240 240" className="compass-dial" role="img"
               aria-label={`כיוון המקדש: ${Math.round(bearing)} מעלות`}>
            <g style={{ transform: `rotate(${roseRot}deg)`, transformOrigin: '120px 120px' }}>
              <circle cx="120" cy="120" r="108" className="dial-ring" />
              <circle cx="120" cy="120" r="88" className="dial-ring-inner" />
              {Array.from({ length: 72 }, (_, i) => {
                const major = i % 6 === 0;
                return (
                  <line
                    key={i}
                    x1="120" y1={major ? 16 : 20} x2="120" y2={major ? 28 : 25}
                    className={major ? 'tick major' : 'tick'}
                    style={{ transform: `rotate(${i * 5}deg)`, transformOrigin: '120px 120px' }}
                  />
                );
              })}
              {ROSE.map((r) => (
                <text
                  key={r.deg} x="120" y="46" className={`rose-label ${r.deg === 0 ? 'north' : ''}`}
                  style={{ transform: `rotate(${r.deg}deg)`, transformOrigin: '120px 120px' }}
                >
                  {r.label}
                </text>
              ))}
              {/* חץ אל המקדש */}
              <g style={{ transform: `rotate(${bearing}deg)`, transformOrigin: '120px 120px' }}>
                <line x1="120" y1="120" x2="120" y2="52" className="needle" />
                <polygon points="120,38 111,58 129,58" className="needle-head" />
                <circle cx="120" cy="120" r="6" className="needle-hub" />
              </g>
            </g>
          </svg>
        </div>

        <div className="compass-readout">
          {atTemple ? (
            <div className="compass-here">אתם בסמוך למקום המקדש</div>
          ) : tooCloseToTell ? (
            <div className="compass-here">
              בחרתם ירושלים — אשרו מיקום מדויק כדי לקבל כיוון אמיתי
            </div>
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
          {aligned && <div className="compass-aligned">אתם פונים לכיוון הנכון</div>}
        </div>

        {sensorState !== 'on' && (
          <button className="btn-primary compass-btn" onClick={enableCompass}>
            הפעלת המצפן החי
          </button>
        )}
        {sensorState === 'idle' && (
          <p className="muted small center">
            בלי הפעלה, החץ מוצג ביחס לצפון: סובבו את המכשיר עד שהאות צ׳ תפנה לצפון.
          </p>
        )}
        {sensorState === 'denied' && (
          <p className="muted small center">ההרשאה לחיישן הכיוון נדחתה — החץ מוצג ביחס לצפון.</p>
        )}
        {sensorState === 'unsupported' && (
          <p className="muted small center">
            במכשיר או בדפדפן הזה אין חיישן כיוון. החץ מוצג ביחס לצפון.
          </p>
        )}
        {geoNote && <p className="muted small center">{geoNote}</p>}
        {pos.source === 'gps' && <p className="muted small center">הכיוון מחושב לפי המיקום המדויק שלכם.</p>}
      </Card>

      <details className="big-sec" open>
        <summary>לאן בדיוק מכוונים</summary>
        <div className="content-sub">
          <ul className="blocks">
            <li><TagBadge tag="דין" /><span>העומד בחוץ לארץ מכוון פניו לארץ ישראל ולבו לירושלים, למקום המקדש ולקודש הקודשים.</span></li>
            <li><TagBadge tag="דין" /><span>העומד בארץ ישראל מכוון פניו לירושלים, ולבו למקום המקדש ולקודש הקודשים.</span></li>
            <li><TagBadge tag="דין" /><span>העומד בירושלים מכוון פניו למקום המקדש, ולבו לקודש הקודשים.</span></li>
            <li><TagBadge tag="הערה" /><span>לכן היעד כאן הוא הר הבית — ולא מרכז העיר ירושלים.</span></li>
          </ul>
        </div>
      </details>

      <details className="big-sec">
        <summary>עד כמה זה מדויק</summary>
        <div className="content-sub">
          <ul className="blocks">
            <li><TagBadge tag="הערה" /><span>החישוב הוא אזימוט של מעגל גדול — הדרך הקצרה ביותר על פני כדור הארץ אל הר הבית.</span></li>
            <li><TagBadge tag="בימינו" /><span>חיישן המצפן בטלפון מושפע ממתכת, ממכשירי חשמל ומכיסוי המכשיר, ועלול לסטות בכמה מעלות. יש לכייל אותו בתנועת שמינייה.</span></li>
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
