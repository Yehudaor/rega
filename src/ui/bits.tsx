import type { ReactNode } from 'react';
import type { LayerKind, DayZmanim } from '../engine/types';
import { kindLabel } from '../engine/layers';
import type { Tag } from '../content/model';
import { fmtTime } from '../engine/format';

export function KindChip({ kind, text }: { kind: LayerKind; text?: string }) {
  return <span className={`chip kind-${kind}`}>{text ?? kindLabel(kind)}</span>;
}

export function TagBadge({ tag }: { tag: Tag }) {
  const cls =
    tag === 'דין' ? 'din'
      : tag === 'ממלכתי' ? 'state'
      : tag === 'היסטוריה' ? 'hist'
      : tag === 'בימינו' ? 'today'
      : tag === 'הערה' || tag === 'טיפ' ? 'note'
      : 'minhag';
  return <span className={`tag tag-${cls}`}>{tag}</span>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className ?? ''}`}>{children}</section>;
}

/**
 * פס היממה האזרחית 00–24 עם סימוני זמנים; מציג חזותית את נקודת
 * המפגש: בשקיעה מתקדם התאריך העברי, בחצות — האזרחי.
 */
export function TimeBar({ z, now }: { z: DayZmanim; now: Date }) {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - dayStart) / 86_400_000) * 100));
  const pNow = pct(now);
  const pAlot = pct(z.alot);
  const pSunrise = pct(z.sunrise);
  const pSunset = pct(z.sunset);
  const pTzeit = pct(z.tzeit);
  const gradient = `linear-gradient(to right,
    var(--night) 0%, var(--night) ${pAlot}%,
    var(--dawn) ${pAlot}%, var(--dawn) ${pSunrise}%,
    var(--day) ${pSunrise}%, var(--day) ${pSunset}%,
    var(--dawn) ${pSunset}%, var(--dawn) ${pTzeit}%,
    var(--night) ${pTzeit}%, var(--night) 100%)`;
  return (
    <div className="timebar-wrap" dir="ltr">
      <div className="timebar" style={{ background: gradient }}>
        <div className="tb-marker now" style={{ left: `${pNow}%` }} title="עכשיו" />
        <div className="tb-marker heb" style={{ left: `${pSunset}%` }} title="שקיעה — התאריך העברי מתחלף" />
      </div>
      <div className="tb-labels" dir="rtl">
        <span>זריחה {fmtTime(z.sunrise)}</span>
        <span className="tb-sunset">שקיעה {fmtTime(z.sunset)} · כאן מתחלף התאריך העברי</span>
        <span>צאת הכוכבים {fmtTime(z.tzeit)}</span>
      </div>
    </div>
  );
}

export function DualDate({ civil, heb }: { civil: string; heb: string }) {
  return (
    <span className="dual-date">
      <span className="dd-civil">{civil}</span>
      <span className="dd-sep">·</span>
      <span className="dd-heb">{heb}</span>
    </span>
  );
}
