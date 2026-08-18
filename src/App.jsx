import React, { useMemo, useState } from 'react'
import { Menu, message } from 'antd'
import { RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import RiskWidgets from './components/RiskWidgets.jsx'
import AgentsTable from './components/AgentsTable.jsx'
import AccessPanel from './components/AccessPanel.jsx'
import OwnerRequestModal from './components/OwnerRequestModal.jsx'
import { AGENTS, BULK_ACTIONS, MARKETING_AGENTS, UNRESOLVED_AGENTS } from './data.js'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [step, setStepRaw] = useState('idle')
  const [suggestionId, setSuggestionId] = useState(null)
  const [scope, setScope] = useState(null)
  const [selected, setSelected] = useState([])
  const [emailOpen, setEmailOpen] = useState(false)
  const [msg, holder] = message.useMessage()

  const setStep = (next, id) => {
    if (id) setSuggestionId(id)
    setStepRaw(next)
    if (next !== 'idle') setCollapsed(false)
  }

  const rows = useMemo(() => {
    if (scope?.kind === 'marketing') return MARKETING_AGENTS
    if (scope?.kind === 'unresolved') return UNRESOLVED_AGENTS
    return AGENTS
  }, [scope])

  const attached = useMemo(() => {
    const names = selected.map((k) => AGENTS.find((a) => a.key === k)?.name).filter(Boolean)
    return names
  }, [selected])

  const onFix = (id) => {
    setSuggestionId(id)
    setStep(id === 'harden' ? 'reading' : 'reading', id)
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
          <RiskWidgets onFix={onFix} />
          <div className="section-gap" />
          <div className="section-label">Agents</div>
          <AgentsTable
            rows={rows}
            selected={selected}
            onSelected={setSelected}
            scope={scope}
            onClearScope={() => setScope(null)}
            onBulk={onBulk}
            onManage={() => setStep('reading', 'harden')}
            onAskAi={() => setStep('idle')}
          />
        </div>
      </main>

      <AccessPanel
        collapsed={collapsed}
        onCollapse={() => setCollapsed((v) => !v)}
        step={step}
        setStep={setStep}
        suggestionId={suggestionId}
        attached={attached}
        onDetach={() => setSelected([])}
        onScope={setScope}
        onOpenEmail={() => setEmailOpen(true)}
      />

      <OwnerRequestModal open={emailOpen} onClose={() => setEmailOpen(false)} />
    </div>
  )
}
