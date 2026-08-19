import React, { useMemo, useState } from 'react'
import { Menu, message } from 'antd'
import { RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import RiskWidgets from './components/RiskWidgets.jsx'
import AgentsTable from './components/AgentsTable.jsx'
import AccessPanel from './components/AccessPanel.jsx'
import OwnerRequestModal from './components/OwnerRequestModal.jsx'
import { ACTION_LABELS, AGENTS, ALL_FINDINGS, SCENARIOS, applyFixes, computeStats } from './data.js'
import { countMatching, explain, parseQuery } from './query.js'

// A set the assistant derives can be pushed to the table, but only when the admin asks for it.
// The chat never changes what the screen shows behind their back.
const SCOPE_FILTERS = {
  marketing: { dept: ['Marketing'] },
  unowned: { owner: ['No owner'] },
}
let chatSeq = 0

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [view, setView] = useState('new')
  const [chats, setChats] = useState([])
  const [activeId, setActiveId] = useState(null)
  // The estate is state, not a constant: applying a change edits it and every widget recounts.
  const [agents, setAgents] = useState(AGENTS)
  const stats = useMemo(() => computeStats(agents), [agents])
  const [filters, setFilters] = useState({})
  const [selected, setSelected] = useState([])
  const [widget, setWidget] = useState(null)
  const [tableAttached, setTableAttached] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [msg, holder] = message.useMessage()

  const chat = chats.find((c) => c.id === activeId) || null

  // Every run is its own chat, so the admin can leave one in the middle, look at the screen
  // and come back to it. Nothing that was started disappears.
  const startChat = (scenarioKey, request) => {
    const scenario = SCENARIOS[scenarioKey]
    const id = `c${++chatSeq}`
    setChats((prev) => [
      {
        id,
        scenarioKey,
        step: 'thinking',
        pending: 'reading',
        messages: [
          { role: 'user', text: request?.text || scenario.title, chips: request?.chips || [] },
          { role: 'assistant', kind: 'thinking' },
        ],
        findings: scenario.findings.map((fid) => ({ ...ALL_FINDINGS.find((f) => f.id === fid) })),
        applied: [],
        createdAt: Date.now(),
      },
      ...prev,
    ])
    setActiveId(id)
    setView('chat')
    setCollapsed(false)
  }

  // A question typed against the table becomes its own chat: the words are turned into the same
  // filters the admin could set by hand, and applied only when they say so.
  const startFilterChat = (text) => {
    const parsed = parseQuery(text)
    const count = Object.keys(parsed).length ? countMatching(parsed) : null
    const id = `c${++chatSeq}`
    setChats((prev) => [
      {
        id,
        kind: 'filter',
        scenarioKey: null,
        query: text,
        parsed,
        count,
        explanation: count === null ? null : explain(parsed, count),
        step: 'thinking',
        pending: 'filterResult',
        findings: [],
        applied: [],
        messages: [
          { role: 'user', text, chips: ['Agents table'] },
          { role: 'assistant', kind: 'thinking' },
        ],
        createdAt: Date.now(),
      },
      ...prev,
    ])
    setActiveId(id)
    setView('chat')
    setCollapsed(false)
    setTableAttached(false)
  }

  const updateChat = (id, patch) =>
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)))

  const openChat = (id) => {
    setActiveId(id)
    setView('chat')
  }

  const attachedAgents = useMemo(
    () => selected.map((k) => agents.find((a) => a.key === k)?.name).filter(Boolean),
    [selected, agents],
  )

  const toggleWidget = (title) => {
    setCollapsed(false)
    setWidget((prev) => (prev === title ? null : title))
  }

  const onBulk = (key, keys) => {
    if (key === 'confirm' || key === 'message') {
      setEmailOpen(true)
      return
    }
    const label = ACTION_LABELS[key]
    msg.success(`${label} · ${keys.length} agent${keys.length > 1 ? 's' : ''} · you can undo this for 10 minutes`)
  }

  return (
    <div className="shell">
      {holder}
      <nav className="sider">
        <div className="sider-label">Agentic access</div>
        <Menu
          mode="inline"
          selectedKeys={['risk']}
          style={{ border: 'none' }}
          items={[
            { key: 'identities', icon: <RobotOutlined />, label: 'Agent Identities' },
            { key: 'risk', icon: <SafetyCertificateOutlined />, label: 'Risk Manager' },
          ]}
        />
      </nav>

      <main className="main">
        <div className="page">
          <h1 className="page-title">Risk Manager</h1>
          <div className="section-label">Risks</div>
          <RiskWidgets
            onFix={(key) => startChat(key, { text: SCENARIOS[key].title, chips: [] })}
            selected={widget}
            onToggle={toggleWidget}
            stats={stats}
          />
          <div className="section-gap" />
          <div className="section-label">Agents</div>
          <AgentsTable
            rows={agents}
            selected={selected}
            onSelected={setSelected}
            filters={filters}
            setFilters={setFilters}
            onBulk={onBulk}
            onAskAi={() => {
              setCollapsed(false)
              setTableAttached(true)
              setView('new')
            }}
          />
        </div>
      </main>

      <AccessPanel
        collapsed={collapsed}
        onCollapse={() => setCollapsed((v) => !v)}
        view={view}
        setView={setView}
        chats={chats}
        chat={chat}
        startChat={startChat}
        startFilterChat={startFilterChat}
        updateChat={updateChat}
        openChat={openChat}
        applyFilters={setFilters}
        onApplied={(ids) => setAgents((prev) => applyFixes(prev, ids))}
        scopeFilters={SCOPE_FILTERS}
        tableAttached={tableAttached}
        onDetachTable={() => setTableAttached(false)}
        attachedWidgets={widget ? [widget] : []}
        attachedAgents={attachedAgents}
        onDetachWidget={() => setWidget(null)}
        onDetachAgents={() => setSelected([])}
        onOpenEmail={() => setEmailOpen(true)}
      />

      <OwnerRequestModal open={emailOpen} onClose={() => setEmailOpen(false)} />
    </div>
  )
}
