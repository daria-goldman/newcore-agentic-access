import React from 'react'

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
  const total = data.reduce((s, d) => s + d.share, 0)
  const rOuter = size / 2
  const rInner = size / 2 - thickness
  let angle = -Math.PI / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Violations by type">
      {data.map((d) => {
        const sweep = (d.share / total) * Math.PI * 2
        const a0 = angle + gap / 2
        const a1 = angle + sweep - gap / 2
        angle += sweep
        return <path key={d.label} d={arcPath(rOuter, rOuter, rOuter, rInner, a0, a1)} fill={d.color} />
      })}
    </svg>
  )
}

export function SeverityBar({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', width: '100%' }}>
      {data.map((d) => (
        <div key={d.label} style={{ width: `${(d.count / total) * 100}%`, background: d.color }} />
      ))}
    </div>
  )
}

export function Trend({ open, resolved, labels }) {
  const w = 250
  const h = 92
  // Zero stays the baseline, and the space under each line is filled instead of left empty,
  // so the chart reads as one block with its legend rather than a line floating in a box.
  const max = Math.max(...open, ...resolved) * 1.05
  const x = (i, series) => (i / (series.length - 1)) * w
  const y = (v) => h - (v / max) * h
  const line = (series) => series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i, series)} ${y(v)}`).join(' ')
  const area = (series) => `${line(series)} L ${w} ${h} L 0 ${h} Z`
  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0.33, 0.66].map((g) => (
          <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="#f5f5f5" strokeWidth="1" />
        ))}
        <path d={area(resolved)} fill="#d9d9d9" opacity="0.35" />
        <path d={area(open)} fill="#1677ff" opacity="0.10" />
        <path d={line(resolved)} fill="none" stroke="#d9d9d9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={line(open)} fill="none" stroke="#1677ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(0,0,0,0.65)', marginTop: 2 }}>
        <span className="legend-row">
          <i style={{ width: 14, height: 2, background: '#1677ff' }} /> Open
        </span>
        <span className="legend-row">
          <i style={{ width: 14, height: 2, background: '#d9d9d9' }} /> Resolved
        </span>
      </div>
    </div>
  )
}
