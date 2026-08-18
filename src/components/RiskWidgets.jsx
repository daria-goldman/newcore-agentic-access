import React from 'react'
import { Button, Card, Tag } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'
import { Donut, SeverityBar, Trend } from './Charts.jsx'
import { BY_SEVERITY, BY_TYPE, THREATS, TREND, UNOWNED, UNOWNED_TOTAL, MARKETING_IN_SCOPE } from '../data.js'

const meta = (text) => <span className="widget-meta">{text}</span>
const sevColor = { Critical: 'red', High: 'orange', Medium: 'gold' }

function Fix({ onClick, children = 'Fix with Access AI' }) {
  return (
    <Button type="link" size="small" className="widget-link" style={{ padding: 0 }} onClick={onClick}>
      {children}
    </Button>
  )
}

export default function RiskWidgets({ onFix }) {
  return (
    <div className="widgets">
      <Card className="widget" size="small" title="Threats detected" extra={meta('8 threats')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {THREATS.map((t) => (
            <div key={t.label} className="stat-row">
              <span style={{ width: 72, flex: '0 0 72px' }}>
                <Tag color={sevColor[t.severity]} style={{ marginInlineEnd: 0 }}>
                  {t.severity}
                </Tag>
              </span>
              <span style={{ color: 'rgba(0,0,0,0.88)' }}>{t.label}</span>
              <b>{t.count}</b>
            </div>
          ))}
        </div>
        <Fix onClick={() => onFix('admin')} />
      </Card>

      <Card className="widget" size="small" title="Violations by severity" extra={meta('43 violations')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SeverityBar data={BY_SEVERITY} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
            {BY_SEVERITY.map((d) => (
              <span key={d.label} className="legend-row">
                <i className="legend-dot" style={{ background: d.color }} />
                <b style={{ fontSize: 12 }}>{d.count}</b>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>{d.label}</span>
              </span>
            ))}
          </div>
        </div>
        <Fix onClick={() => onFix('harden')} />
      </Card>

      <Card className="widget" size="small" title="Violations by type">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Donut data={BY_TYPE} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            {BY_TYPE.map((d) => (
              <span key={d.label} className="legend-row">
                <i className="legend-dot" style={{ background: d.color }} />
                <b style={{ fontSize: 12 }}>{d.share}%</b>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>{d.label}</span>
              </span>
            ))}
          </div>
        </div>
        <Fix onClick={() => onFix('harden')} />
      </Card>

      <Card className="widget" size="small" title="No accountable owner" extra={meta(`${UNOWNED_TOTAL} agents`)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['Owner left the company', UNOWNED.left],
            ['Owner has no HR record', UNOWNED.noHr],
            ['Never had an owner', UNOWNED.never],
          ].map(([label, count]) => (
            <div key={label} className="stat-row">
              <span>{label}</span>
              <b>{count}</b>
            </div>
          ))}
        </div>
        <Fix onClick={() => onFix('owners')} />
      </Card>

      <Card className="widget" size="small" title="Weak authentication path" extra={meta('8 policies')}>
        <div>
          <div style={{ fontWeight: 600 }}>{MARKETING_IN_SCOPE} agents</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>use the weakest path their policy allows</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 8 }}>MKT-01 and 7 more policies</div>
        </div>
        <Fix onClick={() => onFix('path')} />
      </Card>

      <Card
        className="widget"
        size="small"
        title="Issue trend"
        extra={
          <span style={{ color: '#cf1322', fontSize: 12 }}>
            <ArrowUpOutlined /> {TREND.delta} in 90 days
          </span>
        }
      >
        <Trend open={TREND.open} resolved={TREND.resolved} labels={TREND.labels} />
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
          <span className="legend-row">
            <i style={{ width: 14, height: 2, background: '#1677ff' }} /> Open
          </span>
          <span className="legend-row">
            <i style={{ width: 14, height: 2, background: '#d9d9d9' }} /> Resolved
          </span>
        </div>
      </Card>
    </div>
  )
}
