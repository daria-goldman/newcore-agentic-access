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
// The owner, unless they cannot answer. A suspended owner cannot sign in, so the request goes to
// the person who calls the agent most and is not blocked. A departed owner leaves a manager. An
// owner who was never in HR leaves only the application their account lives in.
const recipientFor = (a) => {
  if (!a) return null
  if (a.owner) return a.ownerStatus === 'Suspended' ? a.topCaller : a.owner
  if (a.manager) return a.manager
  if (a.ownerGap === 'noHr') return APP_OWNERS[a.app] || null
  return a.topCaller || null
}
const recipientLabel = (a) => recipientFor(a) || 'Nobody'
const recipientRole = (a) => {
  if (!a) return ''
  if (a.owner && a.ownerStatus === 'Suspended')
    return 'calls this agent most and is not blocked, unlike its owner'
  if (a.owner) return 'owner of this agent'
  if (a.manager) return 'manager of the departed owner'
  if (a.ownerGap === 'noHr') return `owner of ${a.app}, because this agent's owner has no HR record and so no manager`
  if (a.topCaller) return 'calls this agent more than anyone else'
  return 'no owner and no manager on record, so nobody is named'
}
// Why the request is being sent, read from the agent rather than written into the template, so
// the sentence matches the Owner status column instead of contradicting it.
// What the letter opens with, and what it actually asks for. Both follow the reason the request
// exists, because a request to identify an unverified account is not a request to confirm
// ownership, and neither is a request to take over from somebody who is suspended.
const letterFor = (a) => {
  if (a && a.owner && a.ownerStatus === 'Suspended')
    return {
      line: `is owned by ${a.owner}, whose account is suspended, so nobody can answer for it while it keeps running`,
      ask: 'You call this agent more than anyone else. Please take it on, or tell us who should.',
      cta: 'Take ownership',
      decline: 'Somebody else should own it',
    }
  if (a && a.owner)
    return {
      line: 'is running under your name',
      ask: 'Please confirm you still own this agent.',
      cta: 'Confirm ownership',
      decline: 'This is not my agent',
    }
  if (a && a.ownerGap === 'noHr')
    return {
      line: 'is owned by an account that has no record in HR, so there is nobody to hold accountable for it',
      ask: 'You own this application. Please tell us who this account belongs to, or name an owner for the agent.',
      cta: 'Identify the account',
      decline: 'I do not know whose it is',
    }
  return {
    line: 'has been running without an accountable owner since its owner left on 12 April',
    ask: 'Please assign an owner for this agent.',
    cta: 'Assign an owner',
    decline: 'I cannot assign an owner',
  }
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
  const letter = letterFor(sample)

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
                {agents.every((a) => a.owner && a.ownerStatus === 'Suspended')
                  ? 'Whoever calls each agent most'
                  : agents.every((a) => a.ownerGap === 'noHr')
                    ? 'The owner of the application each unverified account lives in'
                    : allUnowned
                      ? 'The closest person on record for each agent'
                      : 'The owner, or the closest person to them'}, {managers.length} people
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
              <b>{sample?.name || 'content-bot'}</b> {letter.line}. It reaches{' '}
              {sample?.app || 'Salesforce'} and {usageLine(sample?.usage)}.
            </p>
            <p style={{ margin: '0 0 10px' }}>{letter.ask}</p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="mail-cta">{letter.cta}</span>
              <a style={{ fontSize: 12 }}>{letter.decline}</a>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  )
}
