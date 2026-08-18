import React from 'react'

export function Donut({ data, size = 96, thickness = 14 }) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Violations by type">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((d) => {
          const len = (d.share / 100) * c
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return el
        })}
      </g>
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
