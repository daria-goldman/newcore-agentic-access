import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Progress, Switch, Tag, Tooltip } from 'antd'
import { CheckCircleFilled, ClockCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import {
  AccountIcon,
  BackIcon,
  ChatIcon,
  HistoryIcon,
  PanelClose,
  PanelOpen,
  PlusIcon,
  RouteIcon,
  ShieldCheckIcon,
  WandIcon,
} from '../icons.jsx'
import Avatar from './Avatar.jsx'
import { SCENARIOS, SUGGESTIONS, WIDGET_TO_SCENARIO, affectedAgents } from '../data.js'
import { answerFor, countMatching } from '../query.js'

const SUGGESTION_TO_SCENARIO = { harden: 'harden', owners: 'owners', path: 'path' }
const SUGGESTION_ICON = { harden: <ShieldCheckIcon />, owners: <AccountIcon />, path: <RouteIcon /> }

function timeLabel(ts) {
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  return `${Math.floor(min / 60)} h ago`
}

export function chatSummary(chat) {
  if (chat.kind === 'filter') return chat.count === null ? 'Nothing to filter on' : `${chat.count} agents match`
  const s = SCENARIOS[chat.scenarioKey]
  if (chat.step === 'thinking') return 'Thinking'
  if (chat.step === 'reading') return 'Reading your estate'
  if (chat.step === 'set') return s.setTitle
  if (chat.step === 'findings') return `${chat.findings.length} findings to review`
  if (chat.step === 'applying') return 'Applying'
  if (chat.step === 'done') return `${chat.applied.filter((a) => a.state === 'applied').length} changes applied`
  return 'Not started'
}

function Impact({ list }) {
  const owners = new Set(list.map((a) => a.owner).filter(Boolean))
  const teams = new Set(list.map((a) => a.dept.value))
  const shown = list.slice(0, 6)
  return (
    <div className="impact step">
      <div className="impact-head">
        {list.length} agents · {owners.size} owners · {teams.size} teams
      </div>
      {shown.map((a) => (
        <div key={a.key} className="impact-row">
          <span className="impact-name">{a.name}</span>
          <span className="impact-owner">{a.owner || 'N/A'}</span>
        </div>
      ))}
      {list.length > shown.length ? (
        <div className="impact-more">and {list.length - shown.length} more</div>
      ) : null}
    </div>
  )
}

function UserMessage({ text, chips }) {
  return (
    <div className="msg">
      {chips?.length ? (
        <div className="msg-chips">
          {chips.map((c) => (
            <Tag key={c} color="blue">
              {c}
            </Tag>
          ))}
        </div>
      ) : null}
      <div className="msg-line">
        <div className="msg-bubble">{text}</div>
        <Avatar />
      </div>
    </div>
  )
}

export default function AccessPanel({
  collapsed,
  onCollapse,
  view,
  setView,
  chats,
  chat,
  startChat,
  startFilterChat,
  updateChat,
  openChat,
  agents,
  applyFilters,
  onApplied,
  scopeFilters,
  tableAttached,
  onDetachTable,
  attachedWidgets,
  attachedAgents,
  onDetachWidget,
  onDetachAgents,
  onOpenEmail,
}) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [draft, setDraft] = useState('')
  const [impact, setImpact] = useState(null)
  const bottomRef = useRef(null)

  const scenario = chat && chat.scenarioKey ? SCENARIOS[chat.scenarioKey] : null
  const step = chat ? chat.step : null

  // Every wait is a real pause before the answer, so the exchange reads like a conversation
  // and not like a screen that repaints.
  useEffect(() => {
    if (step !== 'thinking' || !chat) return
    const next = chat.pending
    const wait = next === 'reading' ? 3000 : next === 'filterResult' ? 1800 : 1400
    const t = setTimeout(() => {
      updateChat(chat.id, (prev) => ({
        step: next,
        pending: null,
        messages: prev.messages.map((m, i) =>
          i === prev.messages.length - 1 && m.kind === 'thinking' ? { ...m, kind: next } : m,
        ),
      }))
    }, wait)
    return () => clearTimeout(t)
  }, [step, chat?.id, chat?.pending])

  useEffect(() => {
    if (step !== 'reading' || !chat || !scenario) return
    setVisibleLines(0)
    const lines = scenario.reading
    const timers = lines.map((_, i) => setTimeout(() => setVisibleLines(i + 1), 250 + i * 650))
    const done = setTimeout(() => {
      updateChat(chat.id, (prev) => ({ step: 'set', messages: [...prev.messages, { role: 'assistant', kind: 'set' }] }))
    }, 250 + lines.length * 650 + 300)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(done)
    }
  }, [step, chat?.id])

  const chosen = useMemo(() => (chat ? chat.findings.filter((f) => f.on) : []), [chat])

  useEffect(() => {
    if (step !== 'applying' || !chat) return
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
                ? 'Requests went out automatically the moment you applied this. A reminder follows in 3 days, and nothing changes for these agents until a person answers.'
                : f.id === 'f4'
                  ? 'Google Drive returned a permission error: this folder is managed by its app owner, so removing access needs their approval.'
                  : null,
            },
          ],
        }))
      }, 350 + i * 420),
    )
    const done = setTimeout(() => {
      // Only what actually landed changes the estate. Waiting on a person and rejected by an
      // app leave the numbers where they were.
      onApplied(chosen.filter((f) => !f.email && f.id !== 'f4').map((f) => f.id))
      updateChat(chat.id, (prev) => ({
        step: 'done',
        messages: [...prev.messages, { role: 'assistant', kind: 'result' }],
      }))
    }, 350 + chosen.length * 420 + 400)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(done)
    }
  }, [step, chat?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat?.messages?.length, chat?.applied?.length, visibleLines, view])

  const toggle = (id) =>
    updateChat(chat.id, (prev) => ({ findings: prev.findings.map((f) => (f.id === id ? { ...f, on: !f.on } : f)) }))

  // The endpoint answers only from the estate data and only when a key is configured on the
  // server. Without one the prototype falls back to the rules it already carries, so a demo
  // never depends on the network.
  const askAssistant = async (text, current) => {
    let answer = null
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question: text,
          history: current.messages.filter((m) => m.text).slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      })
      if (res.ok) answer = (await res.json()).text
    } catch (e) {
      answer = null
    }
    if (!answer) answer = answerFor(text)
    if (!answer)
      answer =
        'I can only answer from what this screen holds: the agents, their owners, the findings and the policies behind them. Ask about one of those, or attach the table and describe a filter.'
    updateChat(current.id, (prev) => ({
      messages: prev.messages.map((m, i) =>
        i === prev.messages.length - 1 && m.kind === 'thinking' ? { role: 'assistant', kind: 'note', text: answer } : m,
      ),
    }))
  }

  const ask = (text, nextStep) =>
    updateChat(chat.id, (prev) => ({
      step: 'thinking',
      pending: nextStep,
      messages: [...prev.messages, { role: 'user', text }, { role: 'assistant', kind: 'thinking' }],
    }))

  const send = () => {
    if (tableAttached) {
      const text = draft.trim() || 'Show me agents with no owner'
      setDraft('')
      startFilterChat(text)
      return
    }
    // A typed question inside an open chat is answered, not turned into a new scenario.
    if (draft.trim() && chat) {
      const text = draft.trim()
      setDraft('')
      updateChat(chat.id, (prev) => ({
        messages: [...prev.messages, { role: 'user', text }, { role: 'assistant', kind: 'thinking' }],
      }))
      askAssistant(text, chat)
      return
    }
    const widget = attachedWidgets[0]
    const chips = [...attachedWidgets, ...(attachedAgents.length > 3 ? [`${attachedAgents.length} agents`] : attachedAgents)]
    const text = draft.trim() || (widget ? `What should I do about ${widget.toLowerCase()}?` : 'What should I do about these agents?')
    setDraft('')
    startChat(widget ? WIDGET_TO_SCENARIO[widget] : 'harden', { text, chips })
  }

  const canSend = attachedWidgets.length > 0 || attachedAgents.length > 0 || tableAttached || draft.trim().length > 0
  const title =
    view === 'list'
      ? 'Chats'
      : view === 'chat' && chat
        ? chat.kind === 'filter'
          ? chat.query
          : scenario?.title
        : chats.length
          ? 'New chat'
          : 'Access AI'

  const renderAssistant = (m, isLast) => {
    if (m.kind === 'note')
      return <div className="step" style={{ fontSize: 13, marginBottom: 16 }}>{m.text}</div>

    if (m.kind === 'filterResult') {
      if (chat.count === null)
        return (
          <div className="step" style={{ fontSize: 13, marginBottom: 16 }}>
            I could not turn that into a filter. Name a department, a risk level, a status, or say something like
            <b> no owner</b>, <b>idle</b> or <b>no sponsor</b>.
          </div>
        )
      return (
        <div className="step" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{chat.count} agents match</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', margin: '4px 0 8px' }}>
            Turned into these filters, the same ones you can set by hand.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {Object.entries(chat.parsed).flatMap(([key, values]) =>
              values.map((v) => (
                <Tag key={`${key}-${v}`} color="blue">
                  {v}
                </Tag>
              )),
            )}
          </div>
          {chat.explanation?.note ? <div className="blind">{chat.explanation.note}</div> : null}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {chat.count > 0 ? (
              <Button type="primary" onClick={() => applyFilters(chat.parsed)}>
                Show them in the table
              </Button>
            ) : null}
            {chat.explanation?.suggestion ? (
              <Button onClick={() => applyFilters(chat.explanation.suggestion)}>{chat.explanation.suggestionLabel}</Button>
            ) : null}
          </div>
        </div>
      )
    }

    if (m.kind === 'thinking')
      return (
        <div className="thinking pulsing">
          <WandIcon width="16" height="16" /> Planning next steps
        </div>
      )

    if (m.kind === 'reading')
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
          {scenario.reading.slice(0, isLast && step === 'reading' ? visibleLines : scenario.reading.length).map((line) => (
            <div key={line} className="step step-line">
              <CheckCircleFilled style={{ color: '#52c41a', marginTop: 3 }} />
              <span>{line}</span>
            </div>
          ))}
          {isLast && step === 'reading' && visibleLines < scenario.reading.length ? (
            <div className="step-line pulsing" style={{ color: 'rgba(0,0,0,0.45)' }}>
              Reading your estate…
            </div>
          ) : null}
        </div>
      )

    if (m.kind === 'set')
      return (
        <div className="step" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{scenario.setTitle}</div>
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
          <div className="blind">
            {scenario.blind}
            {isLast && scenario.blindFilter ? (
              <div style={{ marginTop: 6 }}>
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => applyFilters(scenario.blindFilter)}>
                  {scenario.blindFilterLabel}
                </Button>
              </div>
            ) : null}
          </div>
          {isLast ? (
            // One action and one link, not three buttons that all read as "show me something".
            <div style={{ display: 'flex', gap: 14, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button type="primary" onClick={() => ask('Suggest fixes', 'findings')}>
                Suggest fixes
              </Button>
              {scenario.scope ? (
                <Button type="link" style={{ padding: 0 }} onClick={() => applyFilters(scopeFilters[scenario.scope])}>
                  Show these {countMatching(scopeFilters[scenario.scope])} in the table
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )

    if (m.kind === 'findings')
      return (
        <div className="step" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{chat.findings.length} findings you can act on</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 12 }}>
            Every change carries what it is based on and what it costs. Nothing is applied without you.
          </div>
          {chat.findings.map((f) => (
            <div key={f.id} className={`finding${f.on ? '' : ' off'}`}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Switch size="small" checked={f.on} disabled={!isLast} onChange={() => toggle(f.id)} style={{ marginTop: 2 }} />
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
                  {/* A switch that starts off has to say why, otherwise grey reads as forbidden. */}
                  {!f.on && f.offReason ? <div className="finding-off">{f.offReason}</div> : null}
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    {/* The cost line names what breaks. This names exactly who it happens to. */}
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0 }}
                      onClick={() => setImpact(impact === f.id ? null : f.id)}
                    >
                      {impact === f.id ? 'Hide who this touches' : 'See who this touches'}
                    </Button>
                    {f.email ? (
                      <Button type="link" size="small" style={{ padding: 0 }} onClick={onOpenEmail}>
                        See the request
                      </Button>
                    ) : null}
                  </div>
                  {impact === f.id ? <Impact list={affectedAgents(agents, f.id)} /> : null}
                </div>
              </div>
            </div>
          ))}
          {isLast ? (
            <Button
              type="primary"
              block
              disabled={!chosen.length}
              onClick={() =>
                updateChat(chat.id, (prev) => ({
                  step: 'applying',
                  applied: [],
                  messages: [
                    ...prev.messages,
                    { role: 'user', text: `Apply ${chosen.length} of ${prev.findings.length} changes` },
                    { role: 'assistant', kind: 'applying' },
                  ],
                }))
              }
            >
              Apply {chosen.length} of {chat.findings.length} changes
            </Button>
          ) : null}
        </div>
      )

    if (m.kind === 'applying') {
      // Once the result is written, this list would only repeat it.
      if (step !== 'applying') return null
      return (
        <div style={{ marginBottom: 16 }}>
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
      )
    }

    if (m.kind === 'result') {
      const applied = chat.applied.filter((a) => a.state === 'applied')
      const waiting = chat.applied.filter((a) => a.state === 'waiting')
      const blocked = chat.applied.filter((a) => a.state === 'failed')

      // Everything unfinished in one block, one line each, one action each. Two banners in a
      // row asked the reader to work out which one they were still responsible for.
      const tail = [
        ...blocked.map((a) => ({
          key: a.id,
          tone: 'error',
          title: a.title,
          note: a.note,
          action: { label: 'Ask the app owner to approve', onClick: onOpenEmail },
        })),
        ...waiting.map((a) => ({
          key: a.id,
          tone: 'wait',
          title: a.title,
          note: a.note,
          action: { label: 'See what was sent', onClick: onOpenEmail },
        })),
      ]
      if (scenario.blindFilter) {
        tail.push(
          waiting.length
            ? {
                key: 'blind',
                tone: 'wait',
                title: '3 agents stayed out of this change',
                note: 'Nobody owns them, so nothing here could be applied to them. Their managers have been asked to name an owner.',
                link: { label: 'Show them in the table', onClick: () => applyFilters(scenario.blindFilter) },
              }
            : {
                key: 'blind',
                tone: 'wait',
                title: '3 agents stayed out of this change',
                note: 'Nobody owns them, so nothing here could be applied to them and their department is only a guess.',
                action: { label: 'Email their managers', onClick: onOpenEmail },
                link: { label: 'Show them in the table', onClick: () => applyFilters(scenario.blindFilter) },
              },
        )
      }

      const summary = [
        `${applied.length + waiting.length} applied`,
        waiting.length ? `${waiting.length} waiting on people` : null,
        blocked.length ? `${blocked.length} blocked` : null,
      ].filter(Boolean)

      return (
        <div className="step" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{summary.join(' · ')}</div>
          <div style={{ marginTop: 8 }}>
            {applied.map((a) => (
              <div key={a.id} className="result-line">
                <CheckCircleFilled style={{ color: '#52c41a' }} />
                <span>{a.title}</span>
              </div>
            ))}
          </div>

          {tail.length ? (
            <div className="tail">
              <div className="tail-head">Not done, and why</div>
              {tail.map((row) => (
                <div key={row.key} className="tail-row">
                  <div className="result-line">
                    {row.tone === 'error' ? (
                      <CloseCircleFilled style={{ color: '#cf1322' }} />
                    ) : (
                      <ClockCircleFilled style={{ color: '#faad14' }} />
                    )}
                    <span>{row.title}</span>
                  </div>
                  {row.note ? <div className="pending-note">{row.note}</div> : null}
                  <div style={{ display: 'flex', gap: 14, marginLeft: 22 }}>
                    {row.action ? (
                      <Button type="link" size="small" style={{ padding: 0 }} onClick={row.action.onClick}>
                        {row.action.label}
                      </Button>
                    ) : null}
                    {row.link ? (
                      <Button type="link" size="small" style={{ padding: 0 }} onClick={row.link.onClick}>
                        {row.link.label}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 10 }}>
            This screen does not call the job done.
          </div>
        </div>
      )
    }

    return null
  }

  return (
    // One element for both states. Collapsing animates the width and fades the contents out,
    // instead of swapping one panel for another.
    <aside className={`panel${collapsed ? ' collapsed' : ''}`}>
      <div className="panel-rail">
        <Tooltip title="Open Access AI" placement="left">
          <button className="icon-btn" onClick={onCollapse} aria-label="Open Access AI" tabIndex={collapsed ? 0 : -1}>
            <PanelOpen />
          </button>
        </Tooltip>
      </div>
      <div className="panel-inner">
      <div className="panel-head">
        <Tooltip title="Collapse Access AI" placement="left">
          <button className="icon-btn" onClick={onCollapse} aria-label="Collapse Access AI">
            <PanelClose />
          </button>
        </Tooltip>
        {/* A new chat lives inside the list of chats, so it only offers a way back once
            there is a list to go back to. */}
        {view === 'chat' || (view === 'new' && chats.length > 0) ? (
          <Tooltip title="Back to chats" placement="bottom">
            <button className="icon-btn" onClick={() => setView('list')} aria-label="Back to chats">
              <BackIcon />
            </button>
          </Tooltip>
        ) : null}
        <span className="panel-title">{title}</span>
        {view === 'chat' && chats.length > 1 ? (
          <Tooltip title="Chats" placement="bottom">
            <button className="icon-btn" onClick={() => setView('list')} aria-label="Chats">
              <HistoryIcon />
            </button>
          </Tooltip>
        ) : null}
        {view !== 'new' ? (
          <Tooltip title="New chat" placement="bottom">
            <button className="icon-btn" onClick={() => setView('new')} aria-label="New chat">
              <PlusIcon />
            </button>
          </Tooltip>
        ) : null}
      </div>

      <div className={`panel-body${view === 'new' ? ' start' : ''}`}>
        {view === 'list' && (
          <div className="step">
            {chats.length === 0 ? (
              <div className="chats-empty">No chats yet. Pick a suggestion or attach a widget to start one.</div>
            ) : (
              chats.map((c) => (
                <div key={c.id} className={`chat-row${chat?.id === c.id ? ' active' : ''}`} onClick={() => openChat(c.id)}>
                  <span className="chat-avatar">
                    <ChatIcon />
                  </span>
                  <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                    <div className="chat-title">{c.kind === 'filter' ? c.query : SCENARIOS[c.scenarioKey].title}</div>
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
            <div className="start-mark">
              <WandIcon width="22" height="22" />
            </div>
            <div className="start-title">Where should we start?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <div
                  key={s.id}
                  className="suggestion"
                  onClick={() => startChat(SUGGESTION_TO_SCENARIO[s.id], { text: s.title, chips: [] })}
                >
                  <div className="suggestion-row">
                    <span className="suggestion-icon">{SUGGESTION_ICON[s.id]}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="suggestion-title">{s.title}</div>
                      <div className="suggestion-sub">{s.sub}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'chat' && chat
          ? chat.messages.map((m, i) => (
              <div key={i}>
                {m.role === 'user' ? <UserMessage text={m.text} chips={m.chips} /> : renderAssistant(m, i === chat.messages.length - 1)}
              </div>
            ))
          : null}
        <div ref={bottomRef} />
      </div>

      <div className="panel-foot">
        <div className="composer">
          {attachedWidgets.length || attachedAgents.length || tableAttached ? (
            <div className="composer-chips">
              {tableAttached ? (
                <Tag color="blue" closable onClose={onDetachTable}>
                  Agents table
                </Tag>
              ) : null}
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
      </div>
    </aside>
  )
}
