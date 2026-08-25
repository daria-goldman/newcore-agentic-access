import React, { useState } from 'react'
import { Button, Modal, Segmented, Select, Tag } from 'antd'
import { APP_OWNERS } from '../data.js'

const usageLine = (usage) => {
  if (!usage) return 'has not been used in months'
  // The Usage column already names the gap, so the letter repeats it in a sentence rather than
  // inventing a second way to describe the same silence.
  if (usage.startsWith('Idle ')) return `has not been used in ${usage.slice(5)}`
  return 'was last used in the past week'
}

// The closest human this request can reach. Where somebody owns the agent it is the owner, and
// only where nobody does does it fall to the owner's manager. Both names are on the row itself,
// in the Owner and Manager columns, so the recipient here can never disagree with the table.
// Owner first, then the owner's manager, then the person who owns the application the agent runs
// in. Where none of the three exists there is nobody named at all, and the request reaches only
// the people who call the agent.
const recipientFor = (a) =>
  a ? a.owner || a.manager || (a.ownerGap === 'noHr' ? APP_OWNERS[a.app] : null) || a.topCaller || null : null
// Where an agent never had an owner there is no owner's manager either, so the request falls to
// the third group we decided on: the people who actually call the agent. It is a broadcast, not
// an assignment, and the letter says so rather than pretending a named human is responsible.
const recipientLabel = (a) => recipientFor(a) || 'Nobody'
const recipientRole = (a) => {
  if (!a) return ''
  if (a.owner) return 'owner of this agent'
  if (a.manager) return 'manager of the departed owner'
  if (a.ownerGap === 'noHr') return `owner of ${a.app}, because this agent's owner has no HR record and so no manager`
  if (a.topCaller) return 'calls this agent more than anyone else, and is the only human connected to it'
  return 'no owner and no manager on record, so nobody is named'
}
// Why the request is being sent, read from the agent rather than written into the template, so
// the sentence matches the Owner status column instead of contradicting it.
const openingLine = (a) => {
  if (!a || a.owner) return 'is running under your name'
  if (a.ownerGap === 'left') return 'has been running without an accountable owner since its owner left on 12 April'
  if (a.ownerGap === 'noHr') return 'is owned by somebody with no record in HR, so nobody can be held accountable for it'
  return 'was created without an owner and has never been claimed'
}

// One request or forty eight. The difference is not cosmetic: in bulk there is no single
// recipient to choose, because every agent points at a different person.
export default function OwnerRequestModal({ open, onClose, onSend, agents = [], approval = null, sent = false }) {
  const [showAll, setShowAll] = useState(false)
  const bulk = agents.length > 1
  const managers = [...new Set(agents.map(recipientFor).filter(Boolean))]
  // Agents with nobody named at all. Counted separately, because a recipient list that quietly
  // skipped them would make the request look more complete than it is.
  const unreachable = agents.filter((a) => !recipientFor(a)).length
  const shown = showAll ? managers : managers.slice(0, 5)
  const sample = agents[0]
  const allUnowned = agents.every((a) => !a.owner)
  // The application refused the change, not NewCore. The letter goes to the person who owns that
  // application, and it asks for approval of one specific change, not for ownership of an agent.
  const appOwner = approval ? APP_OWNERS[approval.where] || 'the app owner' : null

  if (approval) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        onOk={() => onSend(1, [appOwner])}
        okText="Send request"
        cancelText="Cancel"
        title="Approval request"
        width={538}
        centered
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Send to</div>
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{appOwner}</span>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}> · owner of {approval.where}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Channel</div>
            <Segmented options={['Email', 'Slack']} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Preview</div>
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
              <p style={{ margin: '0 0 8px' }}>
                <b>{approval.title}</b> was refused by {approval.where}, because the folder is managed by you rather
                than by NewCore.
              </p>
              <p style={{ margin: '0 0 8px' }}>{approval.basis}</p>
              <p style={{ margin: '0 0 10px' }}>
                Cost if you approve: {approval.cost.charAt(0).toLowerCase() + approval.cost.slice(1)}
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <span className="mail-cta">Approve the removal</span>
                <a style={{ fontSize: 12 }}>This access is needed</a>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={() => onSend(Math.max(agents.length, 1), managers)}
      okText={bulk ? `Send ${agents.length} requests` : 'Send request'}
      cancelText="Cancel"
      // Once the requests have gone out this window is a record, not a form. Offering Send again
      // would invite the admin to send the same letter twice to the same people.
      footer={sent ? [<Button key="close" onClick={onClose}>Close</Button>] : undefined}
      title={sent ? 'Request sent' : 'Owner request'}
      width={538}
      centered
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        {bulk ? (
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>{sent ? 'Sent to' : 'Send to'}</div>
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {allUnowned ? 'The closest person on record for each agent' : 'The owner, or the manager where nobody owns the agent'}, {managers.length} people
              </div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', margin: '2px 0 8px' }}>
                One message per agent, {agents.length} in total, each filled in with that agent's own
                details.
                {unreachable
                  ? ` For ${unreachable} of them nobody is named at all.`
                  : ''}
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
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>{sent ? 'Sent to' : 'Send to'}</div>
              {/* One agent has one closest human. Offering a choice here invented a decision
                  the admin does not have to make. */}
              <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{recipientLabel(sample)}</span>
                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}> · {recipientRole(sample)}</span>
              </div>
            </div>
            <div style={{ display: sent ? 'none' : 'block' }}>
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

        {sent ? (
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
            Sent by email when you applied this change. A reminder follows in 3 days.
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Channel</div>
            <Segmented options={['Email', 'Slack']} />
          </div>
        )}

        <div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>
            {sent ? (bulk ? 'What was sent, using the first agent' : 'What was sent') : bulk ? 'Preview, using the first agent' : 'Preview'}
          </div>
          <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: '0 0 8px' }}>
              <b>{sample?.name || 'content-bot'}</b> {openingLine(sample)}. It reaches{' '}
              {sample?.app || 'Salesforce'} and {usageLine(sample?.usage)}.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              {sample?.owner ? 'Please confirm you still own this agent.' : 'Please assign an owner for this agent.'}
            </p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="mail-cta">{sample?.owner ? 'Confirm ownership' : 'Assign an owner'}</span>
              <a style={{ fontSize: 12 }}>{sample?.owner ? 'This is not my agent' : 'I cannot assign an owner'}</a>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  )
}
