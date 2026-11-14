import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

/*
  Small hand-made SVG charts for the statistics (no chart library: light and on-brand).

  Colours (validated for the dark admin surface #0b1020 with the dataviz palette checker):
    one series  → gold  #b08540
    two series  → gold  #b08540 + blue #3987e5   (all checks pass, incl. colour-blind separation)
  Status splits (new/contacted/rejected, active/finished/left) are shown as labelled tiles,
  not as multi-colour charts. One y-axis per chart, always.

  Specs: 2px lines with a ~10% wash, bars ≤ 24px with a 4px rounded end, hairline grid,
  a crosshair + tooltip on time charts, a tooltip on every bar / cell, a legend for 2+ series,
  text in text colours only (never in the series colour).
*/

export const SERIES = ['#b08540', '#3987e5'];

const LOCALES = { uz: 'ru-RU', ru: 'ru-RU', en: 'en-GB' }; // uz: space-grouped like ru

export function useNumber() {
  const { lang } = useI18n();
  const full = new Intl.NumberFormat(LOCALES[lang]);
  const compact = new Intl.NumberFormat(LOCALES[lang], { notation: 'compact', maximumFractionDigits: 1 });
  return {
    n: (v) => (v == null || Number.isNaN(Number(v)) ? '—' : full.format(Number(v))),
    short: (v) => (Math.abs(v) >= 10000 ? compact.format(v) : full.format(v)),
    pct: (v) => (v == null || Number.isNaN(Number(v)) ? '—' : `${full.format(Math.round(Number(v) * 10) / 10)}%`),
  };
}

/** A clean top for an axis and its ticks: 0 / 25 / 50 / 75 / 100 … */
function niceScale(maxValue, steps = 4) {
  if (!(maxValue > 0)) return { max: steps, ticks: [0, 1, 2, 3, 4] };
  if (maxValue <= steps) return { max: steps, ticks: Array.from({ length: steps + 1 }, (_, i) => i) };
  const raw = maxValue / steps;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
  const max = step * steps;
  return { max, ticks: Array.from({ length: steps + 1 }, (_, i) => Math.round(i * step * 100) / 100) };
}

function useWidth(fallback = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth || fallback);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width];
}

/** Floating readout. `tip` = { x, y, title, rows: [[color, value, label]] } in px within the chart box. */
function Tooltip({ tip, width }) {
  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 70), width - 70);
  return (
    <div className="adm-tip" style={{ left, top: tip.y }} role="status">
      {tip.title && <span className="adm-tip__title">{tip.title}</span>}
      {tip.rows.map(([color, value, label], i) => (
        <span key={i} className="adm-tip__row">
          {color && <i style={{ background: color }} />}
          <b>{value}</b>
          {label && <small>{label}</small>}
        </span>
      ))}
    </div>
  );
}

export function Legend({ series }) {
  if (series.length < 2) return null;
  return (
    <div className="adm-legend">
      {series.map((s, i) => (
        <span key={s.key}>
          <i style={{ background: s.color ?? SERIES[i] }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Line + soft area over time. points: [{ label, [key]: number }], series: [{ key, label, color? }] (1–2, same unit).
 * Hover / arrow keys move a crosshair; the tooltip lists every series at that point.
 */
export function TrendChart({ points, series, height = 220, xLabel = (p) => p.label, title }) {
  const fmt = useNumber();
  const [box, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { l: 44, r: 14, t: 14, b: 28 };
  const h = height;
  const innerW = Math.max(10, width - pad.l - pad.r);
  const innerH = h - pad.t - pad.b;
  const values = points.flatMap((p) => series.map((s) => Number(p[s.key]) || 0));
  const { max, ticks } = niceScale(Math.max(0, ...values));
  const x = (i) => pad.l + (points.length <= 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (v) => pad.t + innerH * (1 - (Number(v) || 0) / max);
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 70))));

  const pick = (clientX) => {
    const rect = box.current.getBoundingClientRect();
    const px = clientX - rect.left - pad.l;
    const i = points.length <= 1 ? 0 : Math.round((px / innerW) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  const onKey = (e) => {
    if (!points.length) return;
    if (e.key === 'ArrowRight') setHover((i) => Math.min(points.length - 1, (i ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((i) => Math.max(0, (i ?? points.length) - 1));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };

  const tip =
    hover != null && points[hover]
      ? {
          x: x(hover),
          y: pad.t,
          title: xLabel(points[hover], true),
          rows: series.map((s, i) => [s.color ?? SERIES[i], fmt.n(points[hover][s.key] ?? 0), s.label]),
        }
      : null;

  return (
    <div className="adm-chart">
      <Legend series={series} />
      <div
        ref={box}
        className="adm-chart__box"
        tabIndex={0}
        role="img"
        aria-label={title}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true">
          {ticks.map((tv) => (
            <g key={tv}>
              <line className="adm-grid" x1={pad.l} x2={width - pad.r} y1={y(tv)} y2={y(tv)} />
              <text className="adm-axis" x={pad.l - 8} y={y(tv)} dy="0.32em" textAnchor="end">
                {fmt.short(tv)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % every === 0 || i === points.length - 1 ? (
              <text key={i} className="adm-axis" x={x(i)} y={h - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
                {xLabel(p)}
              </text>
            ) : null,
          )}
          {series.map((s, si) => {
            const color = s.color ?? SERIES[si];
            const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[s.key]).toFixed(1)}`).join('');
            const area = points.length ? `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : '';
            return (
              <g key={s.key}>
                <path d={area} fill={color} opacity="0.1" />
                <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {points.length === 1 && <circle cx={x(0)} cy={y(points[0][s.key])} r="4" fill={color} />}
              </g>
            );
          })}
          {hover != null && points[hover] && (
            <g>
              <line className="adm-crosshair" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} />
              {series.map((s, si) => (
                <circle
                  key={s.key}
                  cx={x(hover)}
                  cy={y(points[hover][s.key])}
                  r="4.5"
                  fill={s.color ?? SERIES[si]}
                  stroke="var(--a-panel)"
                  strokeWidth="2"
                />
              ))}
            </g>
          )}
        </svg>
        <Tooltip tip={tip} width={width} />
      </div>
      <DataTable points={points} series={series} xLabel={(p) => xLabel(p, true)} />
    </div>
  );
}

/** The numbers behind a chart, folded away — every value stays reachable without hovering. */
function DataTable({ points, series, xLabel }) {
  const fmt = useNumber();
  const { lang } = useI18n();
  const label = { uz: 'Jadval ko‘rinishi', ru: 'Таблицей', en: 'As a table' }[lang];
  if (!points.length) return null;
  return (
    <details className="adm-chart__table">
      <summary>{label}</summary>
      <div className="adm-table-wrap">
        <table className="adm-table adm-table--compact">
          <thead>
            <tr>
              <th />
              {series.map((s) => (
                <th key={s.key} className="num">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i}>
                <td>{xLabel(p)}</td>
                {series.map((s) => (
                  <td key={s.key} className="num">
                    {fmt.n(p[s.key] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Vertical bars for a small fixed set (24 hours, 7 weekdays, age groups). items: [{ label, value, title? }] */
export function ColumnChart({ items, height = 180, color = SERIES[0], valueLabel, showEvery = 1, highlight }) {
  const fmt = useNumber();
  const [box, width] = useWidth(400);
  const [hover, setHover] = useState(null);
  const pad = { l: 36, r: 6, t: 10, b: 24 };
  const innerW = Math.max(10, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const { max, ticks } = niceScale(Math.max(0, ...items.map((d) => Number(d.value) || 0)), 3);
  const band = innerW / Math.max(1, items.length);
  const barW = Math.max(3, Math.min(24, band * 0.62));
  const y = (v) => pad.t + innerH * (1 - (Number(v) || 0) / max);

  // a column with a 4px rounded top and a square foot on the baseline
  const bar = (cx, v) => {
    const top = y(v);
    const base = y(0);
    const hgt = base - top;
    if (hgt <= 0) return '';
    const r = Math.min(4, hgt, barW / 2);
    const l = cx - barW / 2;
    const rt = cx + barW / 2;
    return `M${l},${base}V${top + r}Q${l},${top} ${l + r},${top}H${rt - r}Q${rt},${top} ${rt},${top + r}V${base}Z`;
  };

  const tip =
    hover != null
      ? {
          x: pad.l + band * hover + band / 2,
          y: Math.max(0, y(items[hover].value) - 54),
          title: items[hover].title ?? items[hover].label,
          rows: [[null, fmt.n(items[hover].value), valueLabel]],
        }
      : null;

  return (
    <div className="adm-chart">
      <div ref={box} className="adm-chart__box" onPointerLeave={() => setHover(null)}>
        <svg width={width} height={height} aria-hidden="true">
          {ticks.map((tv) => (
            <g key={tv}>
              <line className="adm-grid" x1={pad.l} x2={width - pad.r} y1={y(tv)} y2={y(tv)} />
              <text className="adm-axis" x={pad.l - 7} y={y(tv)} dy="0.32em" textAnchor="end">
                {fmt.short(tv)}
              </text>
            </g>
          ))}
          {items.map((d, i) => {
            const cx = pad.l + band * i + band / 2;
            const strong = highlight != null && highlight === i;
            return (
              <g key={i}>
                <path d={bar(cx, d.value)} fill={color} opacity={hover == null || hover === i ? (strong || highlight == null ? 1 : 0.55) : 0.35} />
                {i % showEvery === 0 && (
                  <text className="adm-axis" x={cx} y={height - 8} textAnchor="middle">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {/* hit areas: the whole band, not just the painted bar */}
        <div className="adm-chart__hits" style={{ left: pad.l, right: pad.r, top: pad.t, bottom: pad.b }}>
          {items.map((d, i) => (
            <button
              key={i}
              type="button"
              className="adm-chart__hit"
              aria-label={`${d.title ?? d.label}: ${fmt.n(d.value)}`}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
          ))}
        </div>
        <Tooltip tip={tip} width={width} />
      </div>
    </div>
  );
}

/** Ranked horizontal bars with the value at the end. items: [{ key, label, value, sub? }] */
export function BarList({ items, limit = 10, color = SERIES[0], format, empty, sort = true }) {
  const fmt = useNumber();
  // a ranking reads top-down: largest first
  const list = (sort ? [...items].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)) : items).slice(0, limit);
  const max = Math.max(1, ...list.map((d) => Number(d.value) || 0));
  if (!list.length) return <p className="adm-muted adm-chart__empty">{empty}</p>;
  return (
    <ul className="adm-barlist">
      {list.map((d, i) => (
        <li key={d.key ?? i} title={`${d.label}: ${format ? format(d.value, d) : fmt.n(d.value)}`}>
          <span className="adm-barlist__label">
            {d.label}
            {d.sub && <small>{d.sub}</small>}
          </span>
          <span className="adm-barlist__track">
            <i style={{ width: `${Math.max(1.5, ((Number(d.value) || 0) / max) * 100)}%`, background: color }} />
          </span>
          <b className="adm-barlist__value">{format ? format(d.value, d) : fmt.n(d.value)}</b>
        </li>
      ))}
    </ul>
  );
}

/** Weekday × hour grid in one hue (light = few, strong = many). cells: [{ day: 0..6 (Mon first), hour: 0..23, value }] */
export function Heatmap({ cells, dayLabels, valueLabel }) {
  const fmt = useNumber();
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...cells.map((c) => c.value));
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  cells.forEach((c) => {
    if (c.day >= 0 && c.day < 7 && c.hour >= 0 && c.hour < 24) grid[c.day][c.hour] += c.value;
  });
  return (
    <div className="adm-heat" onPointerLeave={() => setTip(null)}>
      <div className="adm-heat__grid">
        {grid.map((row, d) => (
          <div key={d} className="adm-heat__row">
            <span className="adm-heat__day">{dayLabels[d]}</span>
            {row.map((v, hr) => (
              <button
                key={hr}
                type="button"
                className="adm-heat__cell"
                style={{ '--k': v ? 0.12 + 0.88 * (v / max) : 0 }}
                aria-label={`${dayLabels[d]} ${String(hr).padStart(2, '0')}:00 — ${fmt.n(v)}`}
                onPointerEnter={(e) => {
                  const host = e.currentTarget.closest('.adm-heat').getBoundingClientRect();
                  const r = e.currentTarget.getBoundingClientRect();
                  setTip({ x: r.left - host.left + r.width / 2, y: r.top - host.top - 52, title: `${dayLabels[d]}, ${String(hr).padStart(2, '0')}:00`, rows: [[null, fmt.n(v), valueLabel]] });
                }}
                onFocus={(e) => {
                  const host = e.currentTarget.closest('.adm-heat').getBoundingClientRect();
                  const r = e.currentTarget.getBoundingClientRect();
                  setTip({ x: r.left - host.left + r.width / 2, y: r.top - host.top - 52, title: `${dayLabels[d]}, ${String(hr).padStart(2, '0')}:00`, rows: [[null, fmt.n(v), valueLabel]] });
                }}
                onBlur={() => setTip(null)}
              />
            ))}
          </div>
        ))}
        <div className="adm-heat__row adm-heat__hours">
          <span className="adm-heat__day" />
          {Array.from({ length: 24 }, (_, hr) => (
            <span key={hr}>{hr % 3 === 0 ? String(hr).padStart(2, '0') : ''}</span>
          ))}
        </div>
      </div>
      <Tooltip tip={tip} width={10000} />
    </div>
  );
}

/** A headline number. `to` makes it a link; `tone="accent"` for the one figure that needs attention. */
export function StatTile({ label, value, sub, tone, children }) {
  return (
    <div className={`adm-tile${tone ? ` adm-tile--${tone}` : ''}`}>
      <span className="adm-tile__label">{label}</span>
      <b className="adm-tile__value">{value}</b>
      {sub && <span className="adm-tile__sub">{sub}</span>}
      {children}
    </div>
  );
}

/** A thin progress line for a share (0–100). */
export function Meter({ value, color = SERIES[0] }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <span className="adm-meter" role="presentation">
      <i style={{ width: `${v}%`, background: color }} />
    </span>
  );
}
