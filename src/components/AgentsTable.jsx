import React, { useMemo, useState } from 'react'
import { Button, Dropdown, Input, Select, Table, Tag, Tooltip } from 'antd'
import { CloseOutlined, DownOutlined, SearchOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { BULK_ACTIONS, TOTAL_AGENTS } from '../data.js'

const riskColor = { High: 'red', Medium: 'gold', Low: 'default' }

function Department({ dept }) {
  if (dept.kind === 'suggested') {
    return (
      <Tooltip title="No owner, so the department could not be derived. This is a guess from the apps the agent uses.">
        <span className="dept-soft">
          Suggested: {dept.value} · {dept.confidence}%
        </span>
      </Tooltip>
    )
  }
  if (dept.kind === 'confirmed') return <span>{dept.value}</span>
  return (
    <Tooltip
      title={
        dept.kind === 'inferred'
          ? "Taken from the owner's department, not from a field on the agent."
          : 'The owner belongs to two departments, so this one is not settled.'
      }
    >
      <span>
        {dept.value} <span className="dept-soft">· {dept.kind}</span>
      </span>
    </Tooltip>
  )
}

export default function AgentsTable({ rows, selected, onSelected, scope, onClearScope, onBulk, onManage, onAskAi }) {
  const [query, setQuery] = useState('')
  const [risk, setRisk] = useState('all')

  const data = useMemo(() => {
    let out = rows
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      out = out.filter((r) => r.name.includes(q) || (r.owner || '').toLowerCase().includes(q))
    }
    if (risk !== 'all') out = out.filter((r) => r.risk === risk)
    return out
  }, [rows, query, risk])

  const columns = [
    {
      title: `Agent (${scope ? rows.length : TOTAL_AGENTS})`,
      dataIndex: 'name',
      width: 190,
      render: (v) => <span style={{ fontVariantLigatures: 'none' }}>{v}</span>,
    },
    { title: 'Department', dataIndex: 'dept', width: 200, render: (dept) => <Department dept={dept} /> },
    {
      title: 'Owner',
      dataIndex: 'owner',
      width: 190,
      render: (owner, r) =>
        owner ? (
          <span>
            {owner}
            {r.ownerNote ? <span className="dept-soft"> · {r.ownerNote}</span> : null}
          </span>
        ) : (
          <span className="dept-soft">{r.ownerNote}</span>
        ),
    },
    { title: 'Risk', dataIndex: 'risk', width: 96, render: (v) => <Tag color={riskColor[v]}>{v}</Tag> },
    { title: 'Usage', dataIndex: 'usage', width: 100 },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v) => <Tag color={v === 'On review' ? 'blue' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      render: (_, r) => (
        <Dropdown
          menu={{ items: BULK_ACTIONS.map((a) => ({ key: a.key, label: a.label, danger: a.danger })), onClick: ({ key }) => onBulk(key, [r.key]) }}
        >
          <Button type="link" size="small" style={{ padding: 0 }}>
            Actions <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
      ),
    },
  ]

  return (
    <div>
      <div className="toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
          placeholder="Search agents"
          style={{ width: 240 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          value={risk}
          style={{ width: 150 }}
          onChange={setRisk}
          options={[
            { value: 'all', label: 'All risk levels' },
            { value: 'High', label: 'High' },
            { value: 'Medium', label: 'Medium' },
            { value: 'Low', label: 'Low' },
          ]}
        />
        <span className="toolbar-grow" />
        <Button type="primary" ghost icon={<ThunderboltOutlined />} onClick={onAskAi}>
          Filter with Access AI
        </Button>
        <Tooltip title="Columns">
          <Button icon={<SettingOutlined />} />
        </Tooltip>
      </div>

      {scope ? (
        <div className="bulkbar scope-chip" style={{ background: '#fafafa', borderColor: '#f0f0f0' }}>
          <span style={{ fontSize: 13 }}>
            <b>{scope.label}</b> <span className="dept-soft">· set built from the owner of each agent, not from a field</span>
          </span>
          <span className="toolbar-grow" />
          <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClearScope}>
            Clear
          </Button>
        </div>
      ) : null}

      {selected.length ? (
        <div className="bulkbar">
          <b>{selected.length} agents selected</b>
          <span className="toolbar-grow" />
          <Dropdown menu={{ items: BULK_ACTIONS.map((a) => ({ key: a.key, label: a.label, danger: a.danger })), onClick: ({ key }) => onBulk(key, selected) }}>
            <Button size="small">
              Edit in bulk <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
          <Button size="small" type="primary" onClick={() => onManage(selected)}>
            Manage in Access AI
          </Button>
          <Button size="small" type="text" onClick={() => onSelected([])}>
            Clear
          </Button>
        </div>
      ) : null}

      <Table
        size="middle"
        rowKey="key"
        columns={columns}
        dataSource={data}
        rowClassName={(r) => (r.inScope && scope ? 'row-in-scope' : '')}
        rowSelection={{ selectedRowKeys: selected, onChange: onSelected, preserveSelectedRowKeys: true }}
        pagination={{ pageSize: 8, showSizeChanger: false, size: 'small' }}
      />
    </div>
  )
}
