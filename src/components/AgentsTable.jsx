import React, { useMemo, useState } from 'react'
import { Button, Checkbox, Dropdown, Input, Table, Tag, Tooltip } from 'antd'
import { DownOutlined, HolderOutlined, LockOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'
import { BULK_ACTIONS } from '../data.js'

const riskColor = { High: 'red', Medium: 'gold', Low: 'default' }

// Agent and Action are pinned: the first column says which identity a row is about and the last one
// is how you act on it, so a table without either is not a table you can work in.
// Owner cannot be hidden either. Ownership is the field every other decision hangs on, it is what
// a department is derived from and who an approval is sent to. Risk was the runner up and stayed
// optional, because you can already filter and sort by it.
const COLUMN_DEFS = {
  name: { title: 'Agent', width: 190, pinned: 'first' },
  dept: { title: 'Department', width: 200, filter: 'dept' },
  owner: { title: 'Owner', width: 190, filter: 'owner', required: true },
  risk: { title: 'Risk', width: 110, filter: 'risk' },
  usage: { title: 'Usage', width: 110, filter: 'usage' },
  status: { title: 'Status', width: 120, filter: 'status' },
  action: { title: 'Action', width: 110, pinned: 'last' },
}
const DEFAULT_ORDER = ['name', 'dept', 'owner', 'risk', 'usage', 'status', 'action']

const FILTER_DEFS = {
  dept: {
    label: 'Department',
    options: ['Marketing', 'Sales', 'Finance', 'Engineering', 'Support', 'Operations', 'Legal', 'People', 'Not derived'],
    match: (r, v) => (v === 'Not derived' ? r.dept.kind === 'suggested' : r.dept.kind !== 'suggested' && r.dept.value === v),
  },
  owner: {
    label: 'Owner',
    options: ['Has an owner', 'No owner'],
    match: (r, v) => (v === 'No owner' ? !r.owner : !!r.owner),
  },
  risk: { label: 'Risk', options: ['High', 'Medium', 'Low'], match: (r, v) => r.risk === v },
  usage: {
    label: 'Usage',
    options: ['daily', 'weekly', 'monthly', 'idle 2 mo', 'idle 4 mo'],
    match: (r, v) => r.usage === v,
  },
  status: { label: 'Status', options: ['Active', 'On review'], match: (r, v) => r.status === v },
}

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

function ColumnManager({ order, setOrder, hidden, setHidden }) {
  const [dragKey, setDragKey] = useState(null)
  const movable = order.filter((k) => !COLUMN_DEFS[k].pinned)

  const drop = (target) => {
    if (!dragKey || dragKey === target) return
    const next = movable.filter((k) => k !== dragKey)
    next.splice(next.indexOf(target), 0, dragKey)
    setOrder(['name', ...next, 'action'])
    setDragKey(null)
  }

  const row = (key, draggable) => {
    const def = COLUMN_DEFS[key]
    const locked = Boolean(def.pinned) || def.required
    return (
      <div
        key={key}
        className={`col-row${draggable ? ' draggable' : ''}${dragKey === key ? ' dragging' : ''}`}
        draggable={draggable}
        onDragStart={() => setDragKey(key)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => drop(key)}
      >
        <span className="col-handle">{draggable ? <HolderOutlined /> : <LockOutlined />}</span>
        <Checkbox
          checked={!hidden.includes(key)}
          disabled={locked}
          onChange={(e) => setHidden(e.target.checked ? hidden.filter((k) => k !== key) : [...hidden, key])}
        >
          {def.title}
        </Checkbox>
        {def.pinned ? <span className="col-note">{def.pinned === 'first' ? 'always first' : 'always last'}</span> : null}
        {def.required && !def.pinned ? <span className="col-note">always shown</span> : null}
      </div>
    )
  }

  return (
    <div className="col-manager">
      <div className="col-manager-head">Columns</div>
      {row('name', false)}
      {movable.map((k) => row(k, true))}
      {row('action', false)}
      <div className="col-manager-foot">
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => { setOrder(DEFAULT_ORDER); setHidden([]) }}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export default function AgentsTable({ rows, selected, onSelected, filters, setFilters, onBulk, onManage, onAskAi }) {
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState(DEFAULT_ORDER)
  const [hidden, setHidden] = useState([])

  // The table filters the rows itself, so the count in the Agent header is always the count
  // of what you are actually looking at.
  const visible = useMemo(() => {
    let out = rows
    const q = query.trim().toLowerCase()
    if (q) out = out.filter((r) => r.name.includes(q) || (r.owner || '').toLowerCase().includes(q))
    Object.entries(filters).forEach(([key, values]) => {
      if (!values || !values.length) return
      out = out.filter((r) => values.some((v) => FILTER_DEFS[key].match(r, v)))
    })
    return out
  }, [rows, query, filters])

  const activeChips = Object.entries(filters).flatMap(([key, values]) =>
    (values || []).map((v) => ({ key, value: v, label: `${FILTER_DEFS[key].label}: ${v}` })),
  )

  const removeChip = (key, value) =>
    setFilters({ ...filters, [key]: (filters[key] || []).filter((v) => v !== value) })

  const setFilterValues = (key, values) => setFilters({ ...filters, [key]: values })

  const filtersMenu = (
    <div className="filter-panel">
      {Object.entries(FILTER_DEFS).map(([key, def]) => (
        <div key={key} className="filter-group">
          <div className="filter-group-title">{def.label}</div>
          <Checkbox.Group
            value={filters[key] || []}
            onChange={(values) => setFilterValues(key, values)}
            options={def.options.map((o) => ({ label: o, value: o }))}
          />
        </div>
      ))}
      <div className="col-manager-foot">
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setFilters({})}>
          Clear all
        </Button>
      </div>
    </div>
  )

  const buildColumn = (key) => {
    const def = COLUMN_DEFS[key]
    const filterKey = def.filter
    const base = {
      key,
      title: key === 'name' ? `Agent (${visible.length})` : def.title,
      dataIndex: key === 'action' ? undefined : key,
      width: def.width,
    }
    if (filterKey) {
      base.filters = FILTER_DEFS[filterKey].options.map((o) => ({ text: o, value: o }))
      base.filteredValue = filters[filterKey] && filters[filterKey].length ? filters[filterKey] : null
      base.onFilter = () => true
    }
    if (key === 'dept') base.render = (dept) => <Department dept={dept} />
    if (key === 'owner')
      base.render = (owner, r) =>
        owner ? (
          <span>
            {owner}
            {r.ownerNote ? <span className="dept-soft"> · {r.ownerNote}</span> : null}
          </span>
        ) : (
          <span className="dept-soft">{r.ownerNote}</span>
        )
    if (key === 'risk') base.render = (v) => <Tag color={riskColor[v]}>{v}</Tag>
    if (key === 'status') base.render = (v) => <Tag color={v === 'On review' ? 'blue' : 'default'}>{v}</Tag>
    if (key === 'action')
      base.render = (_, r) => (
        <Dropdown
          menu={{
            items: BULK_ACTIONS.map((a) => ({ key: a.key, label: a.label, danger: a.danger })),
            onClick: ({ key: k }) => onBulk(k, [r.key]),
          }}
        >
          <Button type="link" size="small" style={{ padding: 0 }}>
            Actions <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
      )
    return base
  }

  const columns = order.filter((k) => !hidden.includes(k)).map(buildColumn)

  return (
    <div>
      <div className="toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
          placeholder="Search agents"
          style={{ width: 220 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Dropdown popupRender={() => filtersMenu} trigger={['click']} placement="bottomLeft">
          <Button>
            Filters {activeChips.length ? <Tag color="blue" style={{ marginInlineEnd: 0 }}>{activeChips.length}</Tag> : null}
            <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
        <Button type="primary" ghost onClick={onAskAi}>
          Filter with Access AI
        </Button>
        <span className="toolbar-grow" />
        <Dropdown
          popupRender={() => <ColumnManager order={order} setOrder={setOrder} hidden={hidden} setHidden={setHidden} />}
          trigger={['click']}
          placement="bottomRight"
        >
          <Tooltip title="Columns">
            <Button icon={<SettingOutlined />} />
          </Tooltip>
        </Dropdown>
      </div>

      {activeChips.length ? (
        <div className="chips-row">
          {activeChips.map((c) => (
            <Tag key={`${c.key}-${c.value}`} color="blue" closable onClose={() => removeChip(c.key, c.value)}>
              {c.label}
            </Tag>
          ))}
          {activeChips.length > 1 ? (
            <Button type="link" size="small" onClick={() => setFilters({})}>
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}

      {selected.length ? (
        <div className="bulkbar">
          <b>{selected.length} agents selected</b>
          <span className="toolbar-grow" />
          <Dropdown
            menu={{
              items: BULK_ACTIONS.map((a) => ({ key: a.key, label: a.label, danger: a.danger })),
              onClick: ({ key }) => onBulk(key, selected),
            }}
          >
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
        dataSource={visible}
        onChange={(_p, tableFilters) => {
          const next = {}
          Object.entries(tableFilters).forEach(([colKey, values]) => {
            const filterKey = COLUMN_DEFS[colKey]?.filter
            if (filterKey) next[filterKey] = values || []
          })
          setFilters(next)
        }}
        rowSelection={{ selectedRowKeys: selected, onChange: onSelected, preserveSelectedRowKeys: true }}
        pagination={{ pageSize: 8, showSizeChanger: false, size: 'small' }}
      />
    </div>
  )
}
