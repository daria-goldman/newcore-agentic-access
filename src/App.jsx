import React, { useMemo, useState } from 'react'
import { Menu, message } from 'antd'
import { RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import RiskWidgets from './components/RiskWidgets.jsx'
import AgentsTable from './components/AgentsTable.jsx'
import AccessPanel from './components/AccessPanel.jsx'
import OwnerRequestModal from './components/OwnerRequestModal.jsx'
import { AGENTS, ALL_FINDINGS, BULK_ACTIONS, SCENARIOS } from './data.js'

// A set the assistant derives is expressed as ordinary table filters, so the admin sees the
// same chips they would have set by hand and can take any of them off.
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
  const [filters, setFilters] = useState({})
  const [selected, setSelected] = useState([])
  const [widget, setWidget] = useState(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [msg, holder] = message.useMessage()

  const chat = chats.find((c) => c.id === activeId) || null

  // Every run is its own chat, so the admin can leave one in the middle, look at the screen
  // and come back to it. Nothing that was started disappears.
  const startChat = (scenarioKey) => {
    const scenario = SCENARIOS[scenarioKey]
    const id = `c${++chatSeq}`
    setChats((prev) => [
      {
        id,
        scenarioKey,
        step: 'reading',
        findings: scenario.findings.map((fid) => ({ ...ALL_FINDINGS.find((f) => f.id === fid) })),
        applied: [],
        createdAt: Date.now(),
      },
      ...prev,
    ])
    setActiveId(id)
    setView('chat')
    setCollapsed(false)
    if (scenario.scope) setFilters(SCOPE_FILTERS[scenario.scope])
  }

  const updateChat = (id, patch) =>
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)))

  const openChat = (id) => {
    const target = chats.find((c) => c.id === id)
    setActiveId(id)
    setView('chat')
    const s = target ? SCENARIOS[target.scenarioKey] : null
    if (s?.scope) setFilters(SCOPE_FILTERS[s.scope])
  }

  const attachedAgents = useMemo(
    () => selected.map((k) => AGENTS.find((a) => a.key === k)?.name).filter(Boolean),
    [selected],
  )

  const toggleWidget = (title) => {
    setCollapsed(false)
    setWidget((prev) => (prev === title ? null : title))
  }

  const onBulk = (key, keys) => {
    if (key === 'owner') {
      setEmailOpen(true)
      return
    }
    const label = BULK_ACTIONS.find((a) => a.key === key)?.label
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
          <RiskWidgets onFix={startChat} selected={widget} onToggle={toggleWidget} />
          <div className="section-gap" />
          <div className="section-label">Agents</div>
          <AgentsTable
            rows={AGENTS}
            selected={selected}
            onSelected={setSelected}
            filters={filters}
            setFilters={setFilters}
            onBulk={onBulk}
            onManage={() => setCollapsed(false)}
            onAskAi={() => {
              setCollapsed(false)
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
        updateChat={updateChat}
        openChat={openChat}
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
