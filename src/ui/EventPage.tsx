import { HDate } from '@hebcal/core';
import type { City, Snapshot } from '../engine/types';
import type { EventContent, NowPhase, Section, TimeKey } from '../content/model';
import { getContent } from '../content';
import { layersFor } from '../engine/layers';
import { dayZmanim, candleLighting } from '../engine/zmanim';
import { addDays, fmtCivilLong, fmtTime, hebDateStr, parseIso } from '../engine/format';
import { Card, KindChip, TagBadge } from './bits';

function resolveTimeKey(hd: HDate, key: TimeKey, city: City): Date {
  const day = hd.greg();
  const z = dayZmanim(day, city);
  const prevDay = addDays(day, -1);
  switch (key) {
    case 'erev-candles': return candleLighting(prevDay, city);
    case 'erev-sunset': return dayZmanim(prevDay, city).sunset;
    case 'erev-tzeit': return dayZmanim(prevDay, city).tzeit;
    case 'alot': return z.alot;
    case 'sunrise': return z.sunrise;
    case 'chatzot': return z.chatzot;
    case 'mincha-gedola': return z.minchaGedola;
    case 'sunset': return z.sunset;
    case 'tzeit': return z.tzeit;
  }
}

function currentPhaseFor(hdEvent: HDate, snap: Snapshot): NowPhase | undefined {
  const nowAbs = snap.hebrew.hd.abs();
  const evAbs = hdEvent.abs();
  if (nowAbs === evAbs) {
    switch (snap.phase.key) {
      case 'beinHashmashot':
      case 'night':
      case 'lateNight':
        return 'night';
      case 'dawn':
      case 'morning':
        return 'morning';
      case 'afternoon':
        return 'afternoon';
    }
  }
  if (nowAbs === evAbs - 1 && snap.phase.key === 'afternoon') return 'erev';
  if (nowAbs === evAbs + 1 && (snap.phase.key === 'night' || snap.phase.key === 'beinHashmashot')) return 'motzaei';
  return undefined;
}

function Blocks({ blocks }: { blocks: { tag?: any; text: string }[] }) {
  return (
    <ul className="blocks">
      {blocks.map((b, i) => (
        <li key={i}>
          {b.tag && <TagBadge tag={b.tag} />}
          <span>{b.text}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionList({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s, i) => (
        <div key={i} className="content-sub">
          <h4>{s.title}</h4>
          <Blocks blocks={s.blocks} />
        </div>
      ))}
    </>
  );
}

export function EventPage({ id, iso, city, snap }: { id: string; iso?: string; city: City; snap: Snapshot }) {
  const content: EventContent | undefined = getContent(id);
  const date = iso ? parseIso(iso) : new Date();
  const hd = new HDate(date);

  if (!content) {
    // אין עדיין עמוד כתוב — שקיפות כיסוי + הנתונים המחושבים בלבד
    const layers = layersFor(hd, city);
    const layer = layers.find((l) => l.id === id);
    return (
      <div className="event-page">
        <a className="back-link" href={iso ? `#/day/${iso}` : '#/'}>→ חזרה</a>
        <Card>
          <h1>{layer?.title ?? 'מועד'}</h1>
          {layer && <KindChip kind={layer.kind} />}
          {layer?.detail && <p>{layer.detail}</p>}
          <p className="coverage-note">
            העמוד המלא של המועד הזה עדיין בהכנה — מוצגים כאן הנתונים המחושבים בלבד.
            המבנה של המערכת בנוי כך שהתוכן גדל בהדרגה, בשקיפות.
          </p>
        </Card>
      </div>
    );
  }

  const activePhase = iso ? currentPhaseFor(hd, snap) : undefined;
  const showInstance = Boolean(iso) && content.kind !== 'period' && content.kind !== 'parsha';

  return (
    <div className="event-page">
      <a className="back-link" href={iso ? `#/day/${iso}` : '#/'}>→ חזרה</a>

      <header className={`event-head kb-${content.kind}`}>
        <div className="layer-head">
          <KindChip kind={content.kind} />
          {activePhase === 'erev' && <span className="chip live">נכנס הערב</span>}
          {activePhase === 'motzaei' && <span className="chip">הסתיים</span>}
          {activePhase && activePhase !== 'motzaei' && activePhase !== 'erev' && (
            <span className="chip live">מתרחש עכשיו</span>
          )}
        </div>
        <h1>{content.name}</h1>
        {showInstance && (
          <div className="event-instance">
            {hebDateStr(hd)} · {fmtCivilLong(date)}
          </div>
        )}
        <p className="status-line">
          <TagBadge tag={content.statusTag} /> {content.statusLine}
        </p>
      </header>

      <Card className="tldr-card">
        <p className="tldr">{content.tldr}</p>
      </Card>

      {content.whatNow && (
        <>
          <h2 className="sec-title">{activePhase ? 'מה חשוב עכשיו' : 'מה עושים בכל שלב'}</h2>
          {content.whatNow.map((w) => {
            const isNow = w.phase === activePhase;
            return (
              <details key={w.phase} className={`phase-sec ${isNow ? 'now-phase' : ''}`} open={isNow || !activePhase && w.phase === 'erev'}>
                <summary>
                  {w.title}
                  {isNow && <span className="chip live small-chip">עכשיו</span>}
                </summary>
                <Blocks blocks={w.items} />
              </details>
            );
          })}
        </>
      )}

      {content.timeline && iso && (
        <>
          <h2 className="sec-title">ציר הזמן ({city.name})</h2>
          <Card>
            <ol className="timeline">
              {content.timeline.map((t, i) => (
                <li key={i}>
                  <span className="tl-time" dir="ltr">{t.timeKey ? fmtTime(resolveTimeKey(hd, t.timeKey, city)) : ''}</span>
                  <span className="tl-label">
                    {t.label}
                    {t.note && <span className="muted small"> — {t.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}

      {content.practical && (
        <details className="big-sec" open>
          <summary>למעשה</summary>
          <SectionList sections={content.practical} />
        </details>
      )}
      {content.background && (
        <details className="big-sec">
          <summary>רקע ומשמעות</summary>
          <SectionList sections={content.background} />
        </details>
      )}
      {content.differences && (
        <details className="big-sec">
          <summary>הבדלי מנהגים</summary>
          <SectionList sections={content.differences} />
        </details>
      )}
      {content.sources && (
        <details className="big-sec">
          <summary>מקורות</summary>
          <ul className="sources">
            {content.sources.map((s, i) => (
              <li key={i}><b>{s.label}</b> — {s.ref}</li>
            ))}
          </ul>
        </details>
      )}

      {content.coverage === 'summary' && (
        <p className="coverage-note">זהו תקציר — העמוד המלא בהכנה.</p>
      )}
      <p className="disclaimer">
        המידע כאן להתמצאות; הוא מפריד בין דין, מנהג והיסטוריה, אך אינו תחליף לפסיקת הלכה.
      </p>
    </div>
  );
}
