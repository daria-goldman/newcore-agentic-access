import React from 'react'
import { Checkbox, Modal, Segmented, Select, Tag } from 'antd'

export default function OwnerRequestModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onClose}
      okText="Send request"
      cancelText="Cancel"
      title="Owner request"
      width={538}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Send to</div>
          <Select
            style={{ width: '100%' }}
            defaultValue="dana"
            options={[
              { value: 'dana', label: 'Dana Weiss · manager of the departed owner' },
              { value: 'users', label: 'Everyone who called this agent in 90 days' },
              { value: 'app', label: 'Owner of the app the agent runs in' },
            ]}
          />
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
        <div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Channel</div>
          <Segmented options={['Email', 'Slack']} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 6 }}>Preview</div>
          <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: '0 0 8px' }}>
              content-bot has been running without an accountable owner since 12 April. It reaches Salesforce and has not
              been used in 4 months.
            </p>
            <p style={{ margin: '0 0 10px' }}>Please name an owner, or tell us this agent is not yours.</p>
            <Tag>Take ownership</Tag>
            <Tag>Not mine, reassign</Tag>
          </div>
        </div>
        <Checkbox defaultChecked>
          <div>
            If nobody replies in 5 days
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              write tools move to ask, so every call waits for a human. The agent keeps running and this is reversible.
            </div>
          </div>
        </Checkbox>
      </div>
    </Modal>
  )
}
