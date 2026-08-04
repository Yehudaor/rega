import { HDate } from '@hebcal/core';
import type { Snapshot, Layer } from '../engine/types';
import { addDays, dayWord, fmtTime, hebDayMonth, isoDate } from '../engine/format';
import { findCity } from '../engine/cities';
import { candleLighting, dayZmanim } from '../engine/zmanim';
import { Card, KindChip, TimeBar } from './bits';

const SHABBAT_CITIES = ['jerusalem', 'tel-aviv', 'haifa', 'beer-sheva'];

/** זמני כניסה ויציאה לארבע הערים הגדולות — כמו בלוחות המודפסים */
function ShabbatTimesCard({ now }: { now: Date }) {
  const delta = (6 - now.getDay() + 7) % 7;
  const sat = addDays(now, delta);
  const fri = addDays(sat, -1);
  const satHd = new HDate(sat);
  return (
    <>
      <h2 className="sec-title">
        {delta === 0 ? 'זמני השבת' : 'השבת הקרובה'} · {hebDayMonth(satHd)}
      </h2>
      <Card className="shabbat-times">
        <table>
          <thead>
            <tr><th></th><th>כניסה</th><th>יציאה</th></tr>
          </thead>
          <tbody>
            {SHABBAT_CITIES.map((id) => {
              const c = findCity(id);
              return (
                <tr key={id}>
                  <td>{c.name}</td>
                  <td dir="ltr">{fmtTime(candleLighting(fri, c))}</td>
                  <td dir="ltr">{fmtTime(dayZmanim(sat, c).tzeit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted small">
          כניסה — הדלקת נרות (ירושלים 40 דק׳ לפני השקיעה, חיפה 30, השאר 20) · יציאה — צאת הכוכבים
        </p>
      </Card>
    </>
  );
}

const clockFmt = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jerusalem',
});

function layerLink(l: Layer, iso: string): string | undefined {
  return l.contentId ? `#/event/${l.contentId}/${l.iso ?? iso}` : undefined;
}

export function NowScreen({ snap, now }: { snap: Snapshot; now: Date }) {
  const strong = snap.layers.filter((l) => l.rank >= 50);
  const quiet = snap.layers.filter((l) => l.rank < 50);
  const primary = strong[0];
  const secondary = strong.slice(1);

  return (
    <div className="now-screen">
      {/* ===== עוגן: איפה אני בזמן ===== */}
      <Card className="hero">
        <div className="hero-clock" dir="ltr">{clockFmt.format(now)}</div>
        <div className="hero-dates">
          <div className="hero-row civil-row">
            <span className="coord-label civil">אזרחי</span>
            <span className="hero-civil">{snap.civil.dateStr}</span>
          </div>
          <div className="hero-row heb-row">
            <span className="coord-label heb">עברי</span>
            <span className="hero-heb">
              כעת: <strong>{snap.hebrew.displayName}</strong>
              <span className="hero-year"> {snap.hebrew.dateStr.split(' ').pop()}</span>
            </span>
          </div>
        </div>
        <p className="boundary-note">{snap.hebrew.boundaryNote}</p>
        <div className="phase-line">
          <span className={`chip phase ${snap.isBeinHashmashot ? 'phase-bhs' : ''}`}>{snap.phase.label}</span>
          {snap.motzaeiNote && <span className="motzaei">{snap.motzaeiNote}</span>}
        </div>
        <TimeBar z={snap.zmanim} now={now} />
      </Card>

      {/* ===== מה חשוב עכשיו ===== */}
      <h2 className="sec-title">מה חשוב עכשיו</h2>
      {primary ? (
        <Card className={`primary-layer kb-${primary.kind}`}>
          <div className="layer-head">
            <KindChip kind={primary.kind} />
            {primary.activeNow && <span className="chip live">מתרחש עכשיו</span>}
          </div>
          <div className="layer-title">{primary.title}</div>
          {primary.detail && <div className="layer-detail">{primary.detail}</div>}
          {layerLink(primary, snap.civil.iso) && (
            <a className="more-link" href={layerLink(primary, snap.civil.iso)}>להקשר המלא ←</a>
          )}
        </Card>
      ) : (
        <Card>
          <div className="layer-title">יום רגיל</div>
          <div className="layer-detail">אין מועד מיוחד היום — וגם זה בסדר גמור.</div>
        </Card>
      )}

      {secondary.length > 0 && (
        <div className="secondary-layers">
          <span className="muted small">מצטרפים היום:</span>
          {secondary.map((l) => (
            <a key={l.id} className={`mini-layer kb-${l.kind}`} href={layerLink(l, snap.civil.iso) ?? `#/day/${snap.civil.iso}`}>
              <KindChip kind={l.kind} /> {l.title}
            </a>
          ))}
        </div>
      )}

      {/* ===== המעבר הבא ===== */}
      {snap.heroTransition && (
        <>
          <h2 className="sec-title">המעבר הבא</h2>
          <Card className="transition-card">
            <div className="tr-hero">
              <span className="tr-time" dir="ltr">{fmtTime(snap.heroTransition.time)}</span>
              <span className="tr-label">
                {dayWord(snap.heroTransition.time, now) === 'מחר' && <span className="chip">מחר</span>}{' '}
                {snap.heroTransition.label}
              </span>
            </div>
            <ul className="tr-list">
              {snap.nextTransitions
                .filter((t) => t !== snap.heroTransition)
                .slice(0, 3)
                .map((t, i) => (
                  <li key={i}>
                    <span className="tr-t" dir="ltr">{fmtTime(t.time)}</span>
                    <span>
                      {dayWord(t.time, now) === 'מחר' ? 'מחר · ' : ''}
                      {t.label}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        </>
      )}

      {/* ===== זמני השבת — ארבע הערים ===== */}
      <ShabbatTimesCard now={now} />

      {/* ===== רקע שקט ===== */}
      {quiet.length > 0 && (
        <div className="quiet-layers">
          {quiet.map((l) => (
            <a key={l.id} className="quiet-item" href={layerLink(l, snap.civil.iso) ?? '#/'}>
              <span className="quiet-title">{l.title}</span>
              {l.detail && <span className="quiet-detail">{l.detail}</span>}
            </a>
          ))}
        </div>
      )}

      {/* ===== בהמשך ===== */}
      {snap.upcoming.length > 0 && (
        <>
          <h2 className="sec-title">בהמשך</h2>
          <Card className="upcoming">
            <ul>
              {snap.upcoming.map((u, i) => (
                <li key={i}>
                  <a href={`#/day/${isoDate(u.date)}`} className="up-row">
                    <span className="up-dates">
                      <span className="up-heb">{u.hdStr}</span>
                      <span className="up-civil">{u.dateStr}</span>
                    </span>
                    <span className={`up-title kb-text-${u.kind}`}>{u.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
