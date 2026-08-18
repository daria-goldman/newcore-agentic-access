import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Progress, Switch, Tag, Tooltip } from 'antd'
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  LeftOutlined,
  MenuUnfoldOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { FINDINGS, MARKETING_IN_SCOPE, OPEN_FINDINGS, SET, SUGGESTIONS, TOTAL_AGENTS, UNOWNED_TOTAL } from '../data.js'

const READING = [
  'No agent carries a department, so I follow each agent to its owner.',
  `${TOTAL_AGENTS} agents checked, 37 belong to someone in Marketing.`,
  '3 of them have no owner at all, so they cannot be placed.',
]

export default function AccessPanel({
  collapsed,
  onCollapse,
  step,
  setStep,
  suggestionId,
  attached,
  onDetach,
  onScope,
  onOpenEmail,
}) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [findings, setFindings] = useState(FINDINGS.map((f) => ({ ...f })))
  const [applied, setApplied] = useState([])

  useEffect(() => {
    if (step !== 'reading') return
    setVisibleLines(0)
    const timers = READING.map((_, i) => setTimeout(() => setVisibleLines(i + 1), 500 + i * 650))
    const done = setTimeout(() => {
      setStep('set')
      onScope({ label: `Marketing agents · ${MARKETING_IN_SCOPE}`, kind: 'marketing' })
    }, 500 + READING.length * 650 + 350)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(done)
    }
  }, [step])

  const chosen = useMemo(() => findings.filter((f) => f.on), [findings])

  useEffect(() => {
    if (step !== 'applying') return
    setApplied([])
    const timers = chosen.map((f, i) =>
      setTimeout(() => {
        setApplied((prev) => [
          ...prev,
          {
            id: f.id,
            title: f.title,
            state: f.email ? 'waiting' : f.id === 'f4' ? 'failed' : 'applied',
            note: f.email
              ? 'sent to the manager of the departed owner'
              : f.id === 'f4'
                ? 'the app rejected the change, its owner must approve'
                : null,
          },
        ])
      }, 350 + i * 420),
    )
    const done = setTimeout(() => setStep('done'), 350 + chosen.length * 420 + 400)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(done)
    }
  }, [step])

  if (collapsed) {
    return (
      <div className="panel collapsed">
        <div style={{ padding: 14, display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Open Access AI" placement="left">
            <Button type="text" icon={<MenuUnfoldOutlined />} onClick={onCollapse} />
          </Tooltip>
        </div>
      </div>
    )
  }

  const toggle = (id) => setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, on: !f.on } : f)))

  return (
    <aside className="panel">
      <div className="panel-head">
        <Button type="text" size="small" icon={<RightOutlined />} onClick={onCollapse} />
        <span>Access AI</span>
      </div>

      <div className="panel-body">
        {step === 'idle' && (
          <div className="step">
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Where should we start?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map((s, i) => (
                <div key={s.id} className={`suggestion${i === 0 ? ' primary' : ''}`} onClick={() => setStep('reading', s.id)}>
                  <div className="suggestion-title">{s.title}</div>
                  <div className="suggestion-sub">{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 12 }}>
              {OPEN_FINDINGS} open findings on this page, {UNOWNED_TOTAL} agents without an owner.
            </div>
          </div>
        )}

        {step === 'reading' && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Harden access for marketing agents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {READING.slice(0, visibleLines).map((line) => (
                <div key={line} className="step step-line">
                  <CheckCircleFilled style={{ color: '#52c41a', marginTop: 3 }} />
                  <span>{line}</span>
                </div>
              ))}
              {visibleLines < READING.length && (
                <div className="step-line pulsing" style={{ color: 'rgba(0,0,0,0.45)' }}>
                  Reading your estate…
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'set' && (
          <div className="step">
            <div style={{ fontSize: 16, fontWeight: 600 }}>{MARKETING_IN_SCOPE} agents in scope</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', margin: '4px 0 12px' }}>
              There is no department on an agent. This set is built through the human who owns it.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {[
                ['Owner sits in Marketing', SET.confirmed, 'derived from the owner record'],
                ['Department inferred', SET.inferred, 'owner has no department, taken from their manager'],
                ['Disputed', SET.disputed, 'owner is a contractor or sits in two departments'],
              ].map(([label, count, why]) => (
                <div key={label} className="stat-row">
                  <Tooltip title={why}>
                    <span>{label}</span>
                  </Tooltip>
                  <b>{count}</b>
                </div>
              ))}
            </div>
            <div className="blind">
              <b>{SET.unresolved} agents could not be placed.</b> Nobody owns them, so their department is a guess from the
              apps they touch. They stay out of this change and become their own task.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Button type="primary" onClick={() => setStep('findings')}>
                Show the 8 findings
              </Button>
              <Button onClick={() => onScope({ label: 'Unplaced candidates · 3', kind: 'unresolved' })}>
                Review the 3
              </Button>
            </div>
          </div>
        )}

        {step === 'findings' && (
          <div className="step">
            <Button type="text" size="small" icon={<LeftOutlined />} style={{ paddingLeft: 0 }} onClick={() => setStep('set')}>
              Back to the set
            </Button>
            <div style={{ fontSize: 16, fontWeight: 600, margin: '6px 0 2px' }}>8 findings across 4 apps and 2 policies</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 12 }}>
              Every change carries what it is based on and what it costs. Nothing is applied without you.
            </div>
            {findings.map((f) => (
              <div key={f.id} className={`finding${f.on ? '' : ' off'}`}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Switch size="small" checked={f.on} onChange={() => toggle(f.id)} style={{ marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="finding-title">{f.title}</div>
                    <div className="finding-meta">
                      {f.where}
                      {f.approval ? (
                        <Tag color="blue" style={{ marginLeft: 6 }}>
                          owner approves
                        </Tag>
                      ) : null}
                    </div>
                    <div className="finding-basis">
                      <b>Because:</b> {f.basis}
                    </div>
                    <div className="finding-cost">
                      <b>Costs:</b> {f.cost}
                    </div>
                    {f.email ? (
                      <Button type="link" size="small" style={{ padding: 0, marginTop: 4 }} onClick={onOpenEmail}>
                        See the request
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            <Button type="primary" block disabled={!chosen.length} onClick={() => setStep('applying')} style={{ marginTop: 4 }}>
              Apply {chosen.length} of {findings.length} changes
            </Button>
          </div>
        )}

        {step === 'applying' && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Applying</div>
            <Progress percent={Math.round((applied.length / chosen.length) * 100)} showInfo={false} />
            <div style={{ marginTop: 10 }}>
              {applied.map((a) => (
                <div key={a.id} className="step result-line">
                  {a.state === 'applied' ? (
                    <CheckCircleFilled style={{ color: '#52c41a' }} />
                  ) : a.state === 'waiting' ? (
                    <ClockCircleFilled style={{ color: '#faad14' }} />
                  ) : (
                    <CloseCircleFilled style={{ color: '#cf1322' }} />
                  )}
                  <span>{a.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="step">
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {applied.filter((a) => a.state === 'applied').length} changes applied
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', margin: '4px 0 12px' }}>
              What follows is the part that is not done, on purpose.
            </div>
            {applied.map((a) => (
              <div key={a.id} className="result-line">
                {a.state === 'applied' ? (
                  <CheckCircleFilled style={{ color: '#52c41a' }} />
                ) : a.state === 'waiting' ? (
                  <ClockCircleFilled style={{ color: '#faad14' }} />
                ) : (
                  <CloseCircleFilled style={{ color: '#cf1322' }} />
                )}
                <span>
                  {a.title}
                  {a.note ? <span className="dept-soft"> · {a.note}</span> : null}
                </span>
              </div>
            ))}
            <div className="blind" style={{ marginTop: 12 }}>
              <b>3 agents were never checked.</b> Nobody owns them, so they were left out of this change and now sit in
              their own task. This screen does not call the job done.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Button
                onClick={() => {
                  setStep('idle')
                  onScope(null)
                }}
              >
                Undo everything
              </Button>
              <Button type="link" onClick={() => setStep('findings')}>
                Back to the findings
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="panel-foot">
        <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 10 }}>
          {attached.length ? (
            <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {attached.length > 3 ? (
                <Tag color="blue" closable onClose={onDetach}>
                  {attached.length} agents attached
                </Tag>
              ) : (
                attached.map((a) => (
                  <Tag key={a} color="blue" closable onClose={onDetach}>
                    {a}
                  </Tag>
                ))
              )}
            </div>
          ) : null}
          <Input.TextArea
            variant="borderless"
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder="Ask about risks and agents, and apply fixes"
            style={{ padding: 0 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button type="primary" size="small" onClick={() => setStep('reading')}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
