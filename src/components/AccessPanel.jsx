import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Progress, Switch, Tag, Tooltip } from 'antd'
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  LeftOutlined,
  HistoryOutlined,
  MessageOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { PanelClose, PanelOpen } from '../icons.jsx'
import { ALL_FINDINGS, OPEN_FINDINGS, SCENARIOS, SUGGESTIONS, UNOWNED_TOTAL, WIDGET_TO_SCENARIO } from '../data.js'

const SUGGESTION_TO_SCENARIO = { harden: 'harden', owners: 'owners', path: 'path', admin: 'threats' }

function timeLabel(ts) {
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  return `${Math.floor(min / 60)} h ago`
}

export function chatSummary(chat) {
  const s = SCENARIOS[chat.scenarioKey]
  if (chat.step === 'reading') return 'Reading your estate'
  if (chat.step === 'set') return s.setTitle
  if (chat.step === 'findings') return `${chat.findings.length} findings to review`
  if (chat.step === 'applying') return 'Applying'
  if (chat.step === 'done') return `${chat.applied.filter((a) => a.state === 'applied').length} changes applied`
  return 'Not started'
}

export default function AccessPanel({
  collapsed,
  onCollapse,
  view,
  setView,
  chats,
  chat,
  startChat,
  updateChat,
  openChat,
  attachedWidgets,
  attachedAgents,
  onDetachWidget,
  onDetachAgents,
  onOpenEmail,
}) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [draft, setDraft] = useState('')

  const scenario = chat ? SCENARIOS[chat.scenarioKey] : null
  const step = chat ? chat.step : null

  useEffect(() => {
    if (step !== 'reading') return
    setVisibleLines(0)
    const lines = scenario.reading
    const timers = lines.map((_, i) => setTimeout(() => setVisibleLines(i + 1), 500 + i * 650))
    const done = setTimeout(() => updateChat(chat.id, { step: 'set' }), 500 + lines.length * 650 + 350)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(done)
    }
  }, [step, chat?.id])

  const chosen = useMemo(() => (chat ? chat.findings.filter((f) => f.on) : []), [chat])

  useEffect(() => {
    if (step !== 'applying') return
    const timers = chosen.map((f, i) =>
      setTimeout(() => {
        updateChat(chat.id, (prev) => ({
          applied: [
            ...prev.applied,
            {
              id: f.id,
              title: f.title,
              state: f.email ? 'waiting' : f.id === 'f4' ? 'failed' : 'applied',
              note: f.email
                ? 'sent, nothing changes until a person answers'
                : f.id === 'f4'
                  ? 'the app rejected the change, its owner must approve'
                  : null,
            },
          ],
        }))
      }, 350 + i * 420),
    )
    const done = setTimeout(() => updateChat(chat.id, { step: 'done' }), 350 + chosen.length * 420 + 400)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(done)
    }
  }, [step, chat?.id])

  if (collapsed) {
    return (
      <div className="panel collapsed">
        <div style={{ padding: 14, display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Open Access AI" placement="left">
            <button className="icon-btn" onClick={onCollapse} aria-label="Open Access AI">
              <PanelOpen />
            </button>
          </Tooltip>
        </div>
      </div>
    )
  }

  const toggle = (id) =>
    updateChat(chat.id, (prev) => ({ findings: prev.findings.map((f) => (f.id === id ? { ...f, on: !f.on } : f)) }))

  const send = () => {
    const fromWidget = attachedWidgets.length ? WIDGET_TO_SCENARIO[attachedWidgets[0]] : null
    setDraft('')
    startChat(fromWidget || 'harden')
  }

  const canSend = attachedWidgets.length > 0 || attachedAgents.length > 0 || draft.trim().length > 0

  const title = view === 'list' ? 'Chats' : view === 'chat' && scenario ? scenario.title : 'Access AI'

  return (
    <aside className="panel">
      <div className="panel-head">
        <Tooltip title="Collapse" placement="bottom">
          <button className="icon-btn" onClick={onCollapse} aria-label="Collapse Access AI">
            <PanelClose />
          </button>
        </Tooltip>
        {view === 'chat' ? (
          <Tooltip title="Back to chats" placement="bottom">
            <button className="icon-btn" onClick={() => setView('list')} aria-label="Back to chats">
              <LeftOutlined />
            </button>
          </Tooltip>
        ) : null}
        <span className="panel-title">{title}</span>
        {view !== 'list' ? (
          <Tooltip title="Chats" placement="bottom">
            <button className="icon-btn" onClick={() => setView('list')} aria-label="Chats">
              <HistoryOutlined />
            </button>
          </Tooltip>
        ) : null}
        <Tooltip title="New chat" placement="bottom">
          <button className="icon-btn" onClick={() => setView('new')} aria-label="New chat">
            <PlusOutlined />
          </button>
        </Tooltip>
      </div>

      <div className="panel-body">
        {view === 'list' && (
          <div className="step">
            {chats.length === 0 ? (
              <div className="chats-empty">No chats yet. Pick a suggestion or attach a widget to start one.</div>
            ) : (
              chats.map((c) => (
                <div key={c.id} className={`chat-row${chat?.id === c.id ? ' active' : ''}`} onClick={() => openChat(c.id)}>
                  <span className="chat-avatar">
                    <MessageOutlined />
                  </span>
                  <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                    <div className="chat-title">{SCENARIOS[c.scenarioKey].title}</div>
                    <div className="chat-sub">{chatSummary(c)}</div>
                  </div>
                  <span className="chat-time">{timeLabel(c.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'new' && (
          <div className="step">
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Where should we start?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map((s, i) => (
                <div
                  key={s.id}
                  className={`suggestion${i === 0 ? ' primary' : ''}`}
                  onClick={() => startChat(SUGGESTION_TO_SCENARIO[s.id])}
                >
                  <div className="suggestion-title">{s.title}</div>
                  <div className="suggestion-sub">{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 12 }}>
              {OPEN_FINDINGS} open findings on this page, {UNOWNED_TOTAL} agents without an owner. Click a widget or pick
              rows to bring them here.
            </div>
          </div>
        )}

        {view === 'chat' && step === 'reading' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {scenario.reading.slice(0, visibleLines).map((line) => (
                <div key={line} className="step step-line">
                  <CheckCircleFilled style={{ color: '#52c41a', marginTop: 3 }} />
                  <span>{line}</span>
                </div>
              ))}
              {visibleLines < scenario.reading.length && (
                <div className="step-line pulsing" style={{ color: 'rgba(0,0,0,0.45)' }}>
                  Reading your estate…
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'chat' && step === 'set' && (
          <div className="step">
            <div style={{ fontSize: 16, fontWeight: 600 }}>{scenario.setTitle}</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', margin: '4px 0 12px' }}>{scenario.setNote}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {scenario.rows.map(([label, count, why]) => (
                <div key={label} className="stat-row">
                  <Tooltip title={why}>
                    <span>{label}</span>
                  </Tooltip>
                  <b>{count}</b>
                </div>
              ))}
            </div>
            <div className="blind">{scenario.blind}</div>
            <Button type="primary" style={{ marginTop: 14 }} onClick={() => updateChat(chat.id, { step: 'findings' })}>
              Show the {chat.findings.length} findings
            </Button>
          </div>
        )}

        {view === 'chat' && step === 'findings' && (
          <div className="step">
            <Button
              type="text"
              size="small"
              icon={<LeftOutlined />}
              style={{ paddingLeft: 0 }}
              onClick={() => updateChat(chat.id, { step: 'set' })}
            >
              Back to the set
            </Button>
            <div style={{ fontSize: 16, fontWeight: 600, margin: '6px 0 2px' }}>
              {chat.findings.length} findings you can act on
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 12 }}>
              Every change carries what it is based on and what it costs. Nothing is applied without you.
            </div>
            {chat.findings.map((f) => (
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
            <Button
              type="primary"
              block
              disabled={!chosen.length}
              onClick={() => updateChat(chat.id, { step: 'applying', applied: [] })}
              style={{ marginTop: 4 }}
            >
              Apply {chosen.length} of {chat.findings.length} changes
            </Button>
          </div>
        )}

        {view === 'chat' && step === 'applying' && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Applying</div>
            <Progress percent={Math.round((chat.applied.length / Math.max(chosen.length, 1)) * 100)} showInfo={false} />
            <div style={{ marginTop: 10 }}>
              {chat.applied.map((a) => (
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

        {view === 'chat' && step === 'done' && (
          <div className="step">
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {chat.applied.filter((a) => a.state === 'applied').length} changes applied
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', margin: '4px 0 12px' }}>
              What follows is the part that is not done, on purpose.
            </div>
            {chat.applied.map((a) => (
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
              <b>{scenario.blindNote}</b> This screen does not call the job done.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Button onClick={() => updateChat(chat.id, { step: 'findings', applied: [] })}>Undo everything</Button>
              <Button type="link" onClick={() => setView('new')}>
                Start something else
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="panel-foot">
        <div className="composer">
          {attachedWidgets.length || attachedAgents.length ? (
            <div className="composer-chips">
              {attachedWidgets.map((w) => (
                <Tag key={w} color="blue" closable onClose={() => onDetachWidget(w)}>
                  {w}
                </Tag>
              ))}
              {attachedAgents.length > 3 ? (
                <Tag color="blue" closable onClose={onDetachAgents}>
                  {attachedAgents.length} agents attached
                </Tag>
              ) : (
                attachedAgents.map((a) => (
                  <Tag key={a} color="blue" closable onClose={onDetachAgents}>
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey && canSend) {
                e.preventDefault()
                send()
              }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button type="primary" size="small" disabled={!canSend} onClick={send}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
