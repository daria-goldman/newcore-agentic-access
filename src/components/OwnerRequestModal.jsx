import React, { useState } from 'react'
import { Checkbox, Modal, Segmented, Select, Tag } from 'antd'

const usageLine = (usage) => {
  if (!usage) return 'has not been used in months'
  const idle = usage.match(/idle (\d+) mo/)
  if (idle) return `has not been used in ${idle[1]} months`
  return `is used ${usage}`
}

// One request or forty eight. The difference is not cosmetic: in bulk there is no single
// recipient to choose, because every agent points at a different manager.
export default function OwnerRequestModal({ open, onClose, onSend, agents = [] }) {
  const [showAll, setShowAll] = useState(false)
  const bulk = agents.length > 1
  const managers = [...new Set(agents.map((a) => a.manager).filter(Boolean))]
  const shown = showAll ? managers : managers.slice(0, 5)
  const sample = agents[0]
  const idle = agents.filter((a) => /idle/.test(a.usage || '')).length
  const active = agents.length - idle

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={() => onSend(Math.max(agents.length, 1), managers)}
      okText={bulk ? `Send ${agents.length} requests` : 'Send request'}
      cancelText="Cancel"
      title="Owner request"
      width={538}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        {bulk ? (
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Send to</div>
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                The manager of each departed owner, {managers.length} people
              </div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', margin: '2px 0 8px' }}>
                One message per agent, {agents.length} in total, each filled in with that agent's own
                details.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {shown.map((m) => (
                  <Tag key={m} style={{ marginInlineEnd: 0 }}>
                    {m}
                  </Tag>
                ))}
                {managers.length > shown.length ? (
                  <a onClick={() => setShowAll(true)} style={{ fontSize: 12 }}>
                    and {managers.length - shown.length} more
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Send to</div>
              {/* One agent has one closest human. Offering a choice here invented a decision
                  the admin does not have to make. */}
              <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{sample?.manager || 'Dana Weiss'}</span>
                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}> · manager of the departed owner</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Template</div>
              <Select
                style={{ width: '100%' }}
                defaultValue="name"
                options={[
                  { value: 'name', label: 'Name a new owner for this agent' },
                  { value: 'confirm', label: 'Confirm you own this agent' },
                  { value: 'decommission', label: 'Confirm this agent can be decommissioned' },
                ]}
              />
            </div>
          </>
        )}

        <div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Channel</div>
          <Segmented options={['Email', 'Slack']} />
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>
            {bulk ? 'Preview, using the first agent' : 'Preview'}
          </div>
          <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: '0 0 8px' }}>
              <b>{sample?.name || 'content-bot'}</b> has been running without an accountable owner since 12
              April. It reaches {sample?.app || 'Salesforce'} and {usageLine(sample?.usage)}.
            </p>
            <p style={{ margin: '0 0 10px' }}>Please assign an owner for this agent.</p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="mail-cta">Assign an owner</span>
              <a style={{ fontSize: 12 }}>I cannot assign an owner</a>
            </div>
          </div>
        </div>

        {/* A request with no consequence gets ignored. A consequence that slows down live work is
            worse than the problem, so the deadline only touches agents that are not working. */}
        <Checkbox defaultChecked>
          <div>
            If nobody replies in 5 days
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              {bulk ? (
                <>
                  {idle} of these agents have not run in months, so they switch to approval only: they
                  keep reading, and anything they try to write waits for a person.
                  {active
                    ? ` The ${active} still in daily use are escalated one level up instead, so nothing running is slowed down.`
                    : ''}{' '}
                  Both are reversible.
                </>
              ) : active ? (
                <>
                  this agent is still in daily use, so nothing about it is restricted. The request is
                  escalated one level up instead. Reversible.
                </>
              ) : (
                <>
                  this agent has not run in months, so it switches to approval only: it keeps reading,
                  and anything it tries to write waits for a person. Reversible.
                </>
              )}
            </div>
          </div>
        </Checkbox>
      </div>
    </Modal>
  )
}
