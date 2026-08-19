import React, { useMemo, useState } from 'react'
import { Menu, message } from 'antd'
import { RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import RiskWidgets from './components/RiskWidgets.jsx'
import AgentsTable from './components/AgentsTable.jsx'
import AccessPanel from './components/AccessPanel.jsx'
import OwnerRequestModal from './components/OwnerRequestModal.jsx'
import { AGENTS, BULK_ACTIONS, MARKETING_AGENTS, UNOWNED_AGENTS } from './data.js'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [step, setStepRaw] = useState('idle')
  const [scenarioKey, setScenarioKey] = useState('harden')
  const [scope, setScope] = useState(null)
  const [selected, setSelected] = useState([])
  const [widgets, setWidgets] = useState([])
  const [emailOpen, setEmailOpen] = useState(false)
  const [msg, holder] = message.useMessage()

  const setStep = (next, key) => {
    if (key) setScenarioKey(key)
    setStepRaw(next)
    if (next !== 'idle') setCollapsed(false)
  }

  const rows = useMemo(() => {
    if (scope?.kind === 'marketing') return MARKETING_AGENTS
    if (scope?.kind === 'unowned') return UNOWNED_AGENTS
    return AGENTS
  }, [scope])

  const attachedAgents = useMemo(
    () => selected.map((k) => AGENTS.find((a) => a.key === k)?.name).filter(Boolean),
    [selected],
  )

  const toggleWidget = (title) => {
    setCollapsed(false)
    setWidgets((prev) => (prev.includes(title) ? prev.filter((w) => w !== title) : [...prev, title]))
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
          <RiskWidgets onFix={(key) => setStep('reading', key)} selected={widgets} onToggle={toggleWidget} />
          <div className="section-gap" />
          <div className="section-label">Agents</div>
          <AgentsTable
            rows={rows}
            selected={selected}
            onSelected={setSelected}
            scope={scope}
            onClearScope={() => setScope(null)}
            onBulk={onBulk}
            onManage={() => setCollapsed(false)}
            onAskAi={() => {
              setCollapsed(false)
              setStep('idle')
            }}
          />
        </div>
      </main>

      <AccessPanel
        collapsed={collapsed}
        onCollapse={() => setCollapsed((v) => !v)}
        step={step}
        setStep={setStep}
        scenarioKey={scenarioKey}
        attachedWidgets={widgets}
        attachedAgents={attachedAgents}
        onDetachWidget={(w) => setWidgets((prev) => prev.filter((x) => x !== w))}
        onDetachAgents={() => setSelected([])}
        onScope={setScope}
        onOpenEmail={() => setEmailOpen(true)}
      />

      <OwnerRequestModal open={emailOpen} onClose={() => setEmailOpen(false)} />
    </div>
  )
}
