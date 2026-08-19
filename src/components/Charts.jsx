import React, { useState } from 'react'

// Drawn as real arcs instead of a dashed stroke: a dashed circle leaves a seam where the
// last segment meets the first one, which reads as a rendering bug.
function arcPath(cx, cy, rOuter, rInner, a0, a1) {
  const point = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const large = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = point(rOuter, a0)
  const [x1, y1] = point(rOuter, a1)
  const [x2, y2] = point(rInner, a1)
  const [x3, y3] = point(rInner, a0)
  return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`
}

export function Donut({ data, size = 96, thickness = 14, gap = 0.03 }) {
  const [hover, setHover] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0 })
  const total = data.reduce((s, d) => s + d.share, 0)
  const rOuter = size / 2
  const rInner = size / 2 - thickness
  let angle = -Math.PI / 2
  const slices = data.map((d) => {
    const sweep = (d.share / total) * Math.PI * 2
    const path = arcPath(rOuter, rOuter, rOuter, rInner, angle + gap / 2, angle + sweep - gap / 2)
    angle += sweep
    return { ...d, path }
  })
  return (
    <div
      style={{ position: 'relative', lineHeight: 0 }}
      onMouseMove={(e) => {
        const box = e.currentTarget.getBoundingClientRect()
        setPos({ x: e.clientX - box.left, y: e.clientY - box.top, w: box.width })
      }}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Violations by type">
        {slices.map((d, i) => (
          <path
            key={d.label}
            d={d.path}
            fill={d.color}
            opacity={hover === null || hover === i ? 1 : 0.35}
            style={{ transition: 'opacity 120ms ease' }}
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null ? (
        <div
          className="chart-tip"
          style={{
            left: pos.x + (pos.x > pos.w - 150 ? -10 : 10),
            top: pos.y - 8,
            transform: pos.x > pos.w - 150 ? 'translateX(-100%)' : 'none',
          }}
        >
          <b>{data[hover].share}%</b> {data[hover].label}
        </div>
      ) : null}
    </div>
  )
}

export function SeverityBar({ data }) {
  const [hover, setHover] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0 })
  const total = data.reduce((s, d) => s + d.count, 0)
  // Same weight as the donut ring, so the two cards read as one system.
  return (
    <div
      style={{ position: 'relative' }}
      onMouseMove={(e) => {
        const box = e.currentTarget.getBoundingClientRect()
        setPos({ x: e.clientX - box.left, y: e.clientY - box.top, w: box.width })
      }}
      onMouseLeave={() => setHover(null)}
    >
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', width: '100%' }}>
        {data.map((d, i) => (
          <div
            key={d.label}
            onMouseEnter={() => setHover(i)}
            style={{
              width: `${(d.count / total) * 100}%`,
              background: d.color,
              opacity: hover === null || hover === i ? 1 : 0.35,
              transition: 'opacity 120ms ease',
            }}
          />
        ))}
      </div>
      {hover !== null ? (
        <div
          className="chart-tip"
          style={{
            left: pos.x + (pos.x > pos.w - 170 ? -10 : 10),
            top: pos.y - 8,
            transform: pos.x > pos.w - 170 ? 'translateX(-100%)' : 'none',
          }}
        >
          <b>{data[hover].count}</b> {data[hover].label.toLowerCase()} · {Math.round((data[hover].count / total) * 100)}% of {total}
        </div>
      ) : null}
    </div>
  )
}

// One palette across the row: the blue family carries volume, the warm family carries severity,
// and grey stays reserved for the residual slice. Two translucent areas stacked on top of each
// other mixed into a muddy third colour, so only the Open series is filled, with a gradient.
export function Trend({ points, tickIndexes }) {
  const [hover, setHover] = useState(null)
  const w = 250
  const h = 92
  const open = points.map((p) => p.open)
  const resolved = points.map((p) => p.resolved)
  const max = Math.max(...open, ...resolved) * 1.05
  const x = (i) => (i / (points.length - 1)) * w
  const y = (v) => h - (v / max) * h
  const line = (series) => series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')
  const area = (series) => `${line(series)} L ${w} ${h} L 0 ${h} Z`

  const track = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - box.left) / box.width
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))))
  }
  const point = hover === null ? null : points[hover]
  const leftPct = hover === null ? 0 : (hover / (points.length - 1)) * 100

  return (
    <div style={{ position: 'relative' }} onMouseMove={track} onMouseLeave={() => setHover(null)}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="openFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1677ff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#1677ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.33, 0.66].map((g) => (
          <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="#f5f5f5" strokeWidth="1" />
        ))}
        <path d={area(open)} fill="url(#openFill)" />
        <path d={line(resolved)} fill="none" stroke="#91caff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={line(open)} fill="none" stroke="#1677ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {hover !== null ? (
          <line x1={x(hover)} x2={x(hover)} y1="0" y2={h} stroke="#d9d9d9" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ) : null}
        {/* The axis the dates sit on, so the labels are not floating in the air. */}
        <line x1="0" x2={w} y1={h} y2={h} stroke="#d9d9d9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>

      {hover !== null ? (
        <>
          <span className="trend-dot" style={{ left: `${leftPct}%`, top: `${y(point.open)}px`, background: '#1677ff' }} />
          <span className="trend-dot" style={{ left: `${leftPct}%`, top: `${y(point.resolved)}px`, background: '#91caff' }} />
          <div
            className="trend-tip"
            style={{
              left: `${leftPct}%`,
              // Flip under the point when there is no room above it, so the tooltip never
              // climbs into the card title.
              top: `${y(point.open) > 58 ? y(point.open) - 10 : y(point.open) + 14}px`,
              transform: `translate(${leftPct > 70 ? '-100%' : leftPct < 30 ? '0' : '-50%'}, ${
                y(point.open) > 58 ? '-100%' : '0'
              })`,
            }}
          >
            <div className="trend-tip-date">{point.date}</div>
            <div>
              <i style={{ background: '#1677ff' }} /> Open <b>{point.open}</b>
            </div>
            <div>
              <i style={{ background: '#91caff' }} /> Resolved <b>{point.resolved}</b>
            </div>
          </div>
        </>
      ) : null}

      {/* Ticks under the axis, and each date centred on its own tick instead of spread evenly. */}
      <div style={{ position: 'relative', height: 5 }}>
        {tickIndexes.map((i, k) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${(i / (points.length - 1)) * 100}%`,
              transform:
                k === 0 ? 'translateX(0)' : k === tickIndexes.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              width: 2,
              height: 5,
              // Same weight and same grey as the axis, so a tick reads as part of the line.
              background: '#d9d9d9',
            }}
          />
        ))}
      </div>
      <div style={{ position: 'relative', height: 16, marginTop: 2 }}>
        {tickIndexes.map((i, k) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${(i / (points.length - 1)) * 100}%`,
              transform:
                k === 0 ? 'translateX(0)' : k === tickIndexes.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              fontSize: 11,
              color: 'rgba(0,0,0,0.45)',
              whiteSpace: 'nowrap',
            }}
          >
            {points[i].date}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'rgba(0,0,0,0.88)', marginTop: 8 }}>
        <span className="legend-row">
          <i style={{ width: 16, height: 3, borderRadius: 2, background: '#1677ff' }} /> Open
        </span>
        <span className="legend-row">
          <i style={{ width: 16, height: 3, borderRadius: 2, background: '#91caff' }} /> Resolved
        </span>
      </div>
    </div>
  )
}
