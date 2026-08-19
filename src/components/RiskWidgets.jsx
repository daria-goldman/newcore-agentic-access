import React from 'react'
import { Button, Card, Tag } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'
import { Donut, SeverityBar, Trend } from './Charts.jsx'
import { BY_SEVERITY, BY_TYPE, THREATS, TREND, UNOWNED, UNOWNED_TOTAL, MARKETING_IN_SCOPE, WIDGET_TO_SCENARIO } from '../data.js'

const meta = (text) => <span className="widget-meta">{text}</span>
const sevColor = { Critical: 'red', High: 'orange', Medium: 'gold' }

// A widget is two things at once: a shortcut that starts the work, and a piece of context
// you can attach to a question. The button does the first, clicking the card does the second.
function Widget({ title, extra, selected, onToggle, onFix, children, statiс }) {
  const scenario = WIDGET_TO_SCENARIO[title]
  const isStatic = !scenario
  return (
    <div
      className={`widget-wrap${selected ? ' selected' : ''}${isStatic ? ' static' : ''}`}
      onClick={isStatic ? undefined : () => onToggle(title)}
    >
      <Card className="widget" size="small" title={title} extra={extra}>
        {children}
        {isStatic ? (
          <span />
        ) : (
          <Button
            type="link"
            size="small"
            className="widget-link"
            style={{ padding: 0 }}
            onClick={(e) => {
              e.stopPropagation()
              onFix(scenario)
            }}
          >
            Fix with Access AI
          </Button>
        )}
      </Card>
    </div>
  )
}

// Only one widget at a time. Two widgets point at different subjects, and an assistant asked
// about both at once has to answer about neither.
export default function RiskWidgets({ onFix, selected, onToggle }) {
  const is = (t) => selected === t
  return (
    <div className="widgets">
      <Widget title="Threats detected" extra={meta('8 threats')} selected={is('Threats detected')} onToggle={onToggle} onFix={onFix}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {THREATS.map((t) => (
            <div key={t.label} className="stat-row">
              <span style={{ width: 72, flex: '0 0 72px' }}>
                <Tag color={sevColor[t.severity]} style={{ marginInlineEnd: 0 }}>
                  {t.severity}
                </Tag>
              </span>
              <span>{t.label}</span>
              <b>{t.count}</b>
            </div>
          ))}
        </div>
      </Widget>

      <Widget title="Violations by severity" extra={meta('43 violations')} selected={is('Violations by severity')} onToggle={onToggle} onFix={onFix}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SeverityBar data={BY_SEVERITY} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
            {BY_SEVERITY.map((d) => (
              <span key={d.label} className="legend-row">
                <i className="legend-dot" style={{ background: d.color }} />
                <b style={{ fontSize: 13 }}>{d.count}</b>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>{d.label}</span>
              </span>
            ))}
          </div>
        </div>
      </Widget>

      <Widget title="Violations by type" selected={is('Violations by type')} onToggle={onToggle} onFix={onFix}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Donut data={BY_TYPE} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            {BY_TYPE.map((d) => (
              <span key={d.label} className="legend-row">
                <i className="legend-dot" style={{ background: d.color }} />
                <b style={{ fontSize: 13 }}>{d.share}%</b>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>{d.label}</span>
              </span>
            ))}
          </div>
        </div>
      </Widget>

      <Widget title="No accountable owner" extra={meta(`${UNOWNED_TOTAL} agents`)} selected={is('No accountable owner')} onToggle={onToggle} onFix={onFix}>
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
      </Widget>

      <Widget title="Weak authentication path" extra={meta('8 policies')} selected={is('Weak authentication path')} onToggle={onToggle} onFix={onFix}>
        <div>
          <div style={{ fontWeight: 600 }}>{MARKETING_IN_SCOPE} agents</div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>use the weakest path their policy allows</div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', marginTop: 8 }}>MKT-01 and 7 more policies</div>
        </div>
      </Widget>

      <Widget
        title="Issue trend"
        extra={
          <span style={{ color: '#cf1322', fontSize: 12 }}>
            <ArrowUpOutlined /> +{TREND.delta} issues in 90 days
          </span>
        }
        selected={false}
        onToggle={() => {}}
        onFix={() => {}}
      >
        <Trend points={TREND.points} tickIndexes={TREND.tickIndexes} />
      </Widget>
    </div>
  )
}
