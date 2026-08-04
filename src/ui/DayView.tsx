import type { City } from '../engine/types';
import { dayDetails } from '../engine/calendar';
import { addDays, fmtTime, isoDate, parseIso } from '../engine/format';
import { Card, KindChip } from './bits';

export function DayView({ iso, city }: { iso: string; city: City }) {
  const date = parseIso(iso);
  if (isNaN(date.getTime())) return <p>תאריך לא תקין</p>;
  const d = dayDetails(date, city);
  const prevIso = isoDate(addDays(date, -1));
  const nextIso = isoDate(addDays(date, 1));
  const strong = d.dayLayers.filter((l) => l.rank >= 50);
  const quiet = d.dayLayers.filter((l) => l.rank < 50);

  return (
    <div className="day-view">
      <div className="day-head">
        <a className="nav-btn" href={`#/day/${prevIso}`} title="יום קודם">‹</a>
        <div className="day-titles">
          <h1>{d.civilStr}</h1>
          <div className="day-heb">
            <span className="coord-label heb">עברי</span> {d.hdStr}
            <span className="muted"> · נכנס אמש בשקיעה, יוצא הערב בצאת הכוכבים</span>
          </div>
        </div>
        <a className="nav-btn" href={`#/day/${nextIso}`} title="יום הבא">›</a>
      </div>

      <h2 className="sec-title">שכבות היום</h2>
      {strong.length === 0 && quiet.length === 0 && (
        <Card><div className="layer-detail">יום רגיל — אין מועד מיוחד.</div></Card>
      )}
      {strong.map((l) => (
        <Card key={l.id} className={`layer-card kb-${l.kind}`}>
          <div className="layer-head"><KindChip kind={l.kind} /></div>
          <div className="layer-title">{l.title}</div>
          {l.detail && <div className="layer-detail">{l.detail}</div>}
          {l.contentId && <a className="more-link" href={`#/event/${l.contentId}/${d.iso}`}>להקשר המלא ←</a>}
        </Card>
      ))}
      {quiet.length > 0 && (
        <div className="quiet-layers">
          {quiet.map((l) => (
            <a key={l.id} className="quiet-item" href={l.contentId ? `#/event/${l.contentId}/${d.iso}` : `#/day/${d.iso}`}>
              <span className="quiet-title">{l.title}</span>
              {l.detail && <span className="quiet-detail">{l.detail}</span>}
            </a>
          ))}
        </div>
      )}

      {d.eveLayers.length > 0 && (
        <>
          <h2 className="sec-title">הערב, מהשקיעה ({fmtTime(d.zmanim.sunset)})</h2>
          <Card className="eve-card">
            <div className="eve-note">בשקיעה נכנס {d.eveHdStr}:</div>
            {d.eveLayers.map((l) => (
              <div key={l.id} className="eve-layer">
                <KindChip kind={l.kind} /> <strong>{l.title}</strong>
                {l.contentId && <a className="more-link" href={`#/event/${l.contentId}/${nextIso}`}>פרטים ←</a>}
              </div>
            ))}
            {d.candle && <div className="eve-time">🕯 הדלקת נרות: {d.candle}</div>}
          </Card>
        </>
      )}
      {!d.eveLayers.length && d.candle && (
        <Card className="eve-card"><div className="eve-time">🕯 הדלקת נרות: {d.candle}</div></Card>
      )}
      {d.havdala && (
        <Card className="eve-card"><div className="eve-time">✦ צאת השבת/החג: {d.havdala}</div></Card>
      )}

      <h2 className="sec-title">זמני היום ({city.name})</h2>
      <Card>
        <div className="zman-grid">
          <div><span>עלות השחר</span><b dir="ltr">{fmtTime(d.zmanim.alot)}</b></div>
          <div><span>זמן טלית ותפילין</span><b dir="ltr">{fmtTime(d.zmanim.misheyakir)}</b></div>
          <div><span>הנץ החמה</span><b dir="ltr">{fmtTime(d.zmanim.sunrise)}</b></div>
          <div><span>סוף זמן ק״ש</span><b dir="ltr">{fmtTime(d.zmanim.sofShma)}</b></div>
          <div><span>סוף זמן תפילה</span><b dir="ltr">{fmtTime(d.zmanim.sofTfilla)}</b></div>
          <div><span>חצות היום</span><b dir="ltr">{fmtTime(d.zmanim.chatzot)}</b></div>
          <div><span>מנחה גדולה</span><b dir="ltr">{fmtTime(d.zmanim.minchaGedola)}</b></div>
          <div><span>פלג המנחה</span><b dir="ltr">{fmtTime(d.zmanim.plag)}</b></div>
          <div><span>שקיעה</span><b dir="ltr">{fmtTime(d.zmanim.sunset)}</b></div>
          <div><span>צאת הכוכבים</span><b dir="ltr">{fmtTime(d.zmanim.tzeit)}</b></div>
          <div><span>צאת הכוכבים — רבנו תם</span><b dir="ltr">{fmtTime(d.zmanim.tzeitRT)}</b></div>
        </div>
        <p className="muted small">זמני צאת הכוכבים לפי 8.5 מעלות מתחת לאופק — השיטה הנפוצה בלוחות בישראל.</p>
      </Card>
    </div>
  );
}
