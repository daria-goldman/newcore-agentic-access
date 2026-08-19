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
  const h = 96
  const max = Math.max(...open, ...resolved) * 1.15
  const path = (series) =>
    series
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (series.length - 1)) * w} ${h - (v / max) * h}`)
      .join(' ')
  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="#f0f0f0" strokeWidth="1" />
        ))}
        <path d={path(resolved)} fill="none" stroke="#d9d9d9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={path(open)} fill="none" stroke="#1677ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  )
}
