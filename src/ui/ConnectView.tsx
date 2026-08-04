import { useState } from 'react';
import { CITIES } from '../engine/cities';
import type { City } from '../engine/types';
import { Card } from './bits';

/** בסיס הכתובת של האתר, בלי שם הקובץ */
function siteBase(): string {
  return location.origin + location.pathname.replace(/[^/]*$/, '');
}

function webcalOf(url: string): string {
  return url.replace(/^https?:/, 'webcal:');
}

function googleAddUrl(url: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalOf(url))}`;
}

function FeedBlock({ title, note, url }: { title: string; note: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="feed-card">
      <h3>{title}</h3>
      <p className="muted small">{note}</p>
      <div className="feed-actions">
        <a className="btn-primary btn-link" href={webcalOf(url)}>
          הוספה ליומן (אייפון · מק)
        </a>
        <a className="btn-secondary btn-link" href={googleAddUrl(url)} target="_blank" rel="noreferrer">
          הוספה ליומן גוגל
        </a>
      </div>
      <div className="ics-row" dir="ltr">
        <input className="ics-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        <button
          className="btn-secondary"
          onClick={() => {
            navigator.clipboard?.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? '✓ הועתק' : 'העתקה'}
        </button>
      </div>
    </Card>
  );
}

export function ConnectView({ city }: { city: City }) {
  const [cityId, setCityId] = useState(city.id);
  const base = siteBase();

  return (
    <div className="connect-view">
      <h1 className="connect-title">חיבור ליומן</h1>
      <p className="connect-intro">
        לוח "רגע" יופיע כלוח־משנה בתוך היומן שכבר יש לכם — גוגל, אפל או אאוטלוק —
        לצד הפגישות הרגילות. אפשר לכבות ולהדליק אותו בכל רגע, ולתת לו צבע משלו.
      </p>

      <FeedBlock
        title="לוח עברי"
        note="חגים, מועדים, צומות, ראשי חודשים ופרשות השבוע. זהה לכל הארץ — זה הקישור לשלוח לחברים."
        url={`${base}rega.ics`}
      />

      <details className="big-sec">
        <summary>רוצים גם זמני כניסת ויציאת שבת?</summary>
        <div className="content-sub">
          <p className="muted small">
            לוח נוסף שכולל, מלבד כל הנ״ל, גם הדלקת נרות והבדלה בכל שבת וחג — לפי עיר.
            שימו לב: זה מוסיף כשני אירועים בשבוע ליומן.
          </p>
          <select className="city-select" value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <FeedBlock
            title={`לוח עם זמני שבת · ${CITIES.find((c) => c.id === cityId)?.name}`}
            note="כולל הדלקת נרות והבדלה לפי המקום."
            url={`${base}rega-${cityId}.ics`}
          />
        </div>
      </details>

      <details className="big-sec">
        <summary>הוראות ידניות (אם הכפתור לא עבד)</summary>
        <div className="content-sub">
          <ul className="blocks">
            <li><b>אייפון:</b> הגדרות ← אפליקציות ← לוח שנה ← חשבונות ← הוספת חשבון ← אחר ← הוספת מינוי ללוח שנה ← הדביקו את הקישור.</li>
            <li><b>מק:</b> לוח שנה ← קובץ ← מינוי לוח שנה חדש.</li>
            <li><b>גוגל</b> (במחשב): הגדרות ← הוספת יומן ← מכתובת URL.</li>
            <li><b>למניעת כפילויות:</b> אם מופעל אצלכם יומן "חגים יהודיים" המובנה של גוגל — כדאי לכבותו.</li>
          </ul>
        </div>
      </details>

      <details className="big-sec">
        <summary>מה היומן יכול להראות — ומה רק כאן</summary>
        <div className="content-sub">
          <ul className="blocks">
            <li>
              יומני גוגל ואפל בנויים על יממה שמתחילה בחצות, ולכן הם מציגים מועד כ״יום שלם״
              ולא יודעים להראות שהיום העברי נכנס בשקיעה. גם התאריך העברי המדויק ברגע נתון —
              לא קיים שם.
            </li>
            <li>
              בגוגל אפשר להוסיף תאריך עברי בפינת כל תא: הגדרות ← כללי ← לוח שנה חלופי ← עברי.
              באפל אין אפשרות כזו.
            </li>
            <li>
              היומן נותן את התזכורת; ההתמצאות — מה עכשיו, מה חשוב עכשיו ומתי בדיוק מתחלף
              התאריך — נשארת כאן.
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}
