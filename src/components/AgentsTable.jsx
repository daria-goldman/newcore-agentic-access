import React, { useMemo, useState } from 'react'
import { Button, Checkbox, Dropdown, Input, Table, Tag, Tooltip } from 'antd'
import { DownOutlined, HolderOutlined, LockOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'
import { ChevronDownIcon } from '../icons.jsx'
import { ACTION_GROUPS, AGENTS, SEVERITY_TAG } from '../data.js'
import { FILTER_MATCH } from '../query.js'

// Silence is a duration, not a verdict, so it stays out of red. Red belongs to Risk, which is the
// column that actually judges the agent, and an agent reading Low risk next to a red Usage tag
// would be the screen arguing with itself. Three bands: ordinary, stale, long dead. The exact
// number of months is in the label, the colour only says which band it falls in.
const usageColor = {
  'Used this week': 'default',
  'Idle 1 week': 'default',
  'Idle 2 weeks': 'default',
  'Idle 1 month': 'gold',
  'Idle 2 months': 'gold',
  'Idle 3 months': 'orange',
  'Idle 6 months': 'orange',
}

// Agent and Action are pinned: the first column says which identity a row is about and the last one
// is how you act on it, so a table without either is not a table you can work in.
// Owner cannot be hidden either. Ownership is the field every other decision hangs on, it is what
// a department is derived from and who an approval is sent to. Risk was the runner up and stayed
// optional, because you can already filter and sort by it.
const COLUMN_DEFS = {
  name: { title: 'Agent', width: 165, pinned: 'first' },
  dept: { title: 'Department', width: 175, filter: 'dept' },
  owner: { title: 'Owner', width: 165, filter: 'owner', required: true },
  risk: { title: 'Risk', width: 90, filter: 'risk' },
  usage: { title: 'Usage', width: 145, filter: 'usage' },
  // Off by default, but next to Usage rather than at the end of the list: it is the exact date
  // behind the bucket, so the place to look for it is right where the bucket is.
  lastUsed: { title: 'Last used', width: 140, filter: 'lastUsed', optional: true },
  status: { title: 'Status', width: 105, filter: 'status' },
  // Off by default: useful, but not what the admin scans for first. The five owner columns are
  // the rest of the Human record from the brief, flattened onto the agent row, so a question about
  // the person behind an agent can be answered without leaving the table.
  manager: { title: 'Manager', width: 165, filter: 'manager', optional: true },
  ownerTitle: { title: 'Owner title', width: 195, filter: 'ownerTitle', optional: true },
  ownerEmail: { title: 'Owner email', width: 225, optional: true },
  ownerType: { title: 'Owner type', width: 130, filter: 'ownerType', optional: true },
  ownerStatus: { title: 'Owner status', width: 145, filter: 'ownerStatus', optional: true },
  created: { title: 'Date created', width: 140, filter: 'created', optional: true },
  action: { title: 'Actions', width: 80, pinned: 'last' },
}
const DEFAULT_ORDER = [
  'name', 'dept', 'owner', 'risk', 'usage', 'lastUsed', 'status',
  'manager', 'ownerTitle', 'ownerEmail', 'ownerType', 'ownerStatus', 'created', 'action',
]
const DEFAULT_HIDDEN = ['manager', 'ownerTitle', 'ownerEmail', 'ownerType', 'ownerStatus', 'lastUsed', 'created']

// Every value the column actually holds, sorted, with N/A last where the field can be empty.
function namesIn(key) {
  const values = [...new Set(AGENTS.map((a) => a[key]).filter(Boolean))].sort()
  return AGENTS.some((a) => !a[key]) ? [...values, 'N/A'] : values
}

const FILTER_DEFS = {
  dept: {
    label: 'Department',
    options: ['Marketing', 'Sales', 'Finance', 'Engineering', 'Support', 'Operations', 'Legal', 'People', 'Not derived'],
  },
  owner: { label: 'Owner', options: ['Has an owner', 'No owner'] },
  risk: { label: 'Risk', options: ['Critical', 'High', 'Medium', 'Low'] },
  usage: {
    label: 'Usage',
    options: ['Used this week', 'Idle 1 week', 'Idle 2 weeks', 'Idle 1 month', 'Idle 2 months', 'Idle 3 months', 'Idle 6 months'],
  },
  status: { label: 'Status', options: ['Active', 'On review'] },
  ownerType: { label: 'Owner type', options: ['Employee', 'Contractor', 'Consultant', 'N/A'] },
  // The brief's own status list for a Human, plus N/A for an agent that never had one.
  ownerStatus: {
    label: 'Owner status',
    options: ['Active', 'Suspended', 'Staged', 'Pending activation', 'Deactivated', 'Discovered', 'N/A'],
  },
  guess: {
    label: 'Suggested department',
    options: ['Marketing', 'Sales', 'Finance', 'Engineering', 'Support', 'Operations', 'Legal', 'People'],
  },
  lastUsed: { label: 'Last used', options: ['Today', 'This week', 'This month', 'Older than 3 months'] },
  created: { label: 'Date created', options: ['Last 30 days', 'This year', 'Older than a year'] },
  // Read off the estate rather than written down, so a name added to the data appears in the list
  // without anybody remembering to update it. Both are long enough to need the search box.
  manager: { label: 'Manager', options: namesIn('manager'), search: true },
  ownerTitle: { label: 'Owner title', options: namesIn('ownerTitle'), search: true },
  // Set by the assistant when it narrows a set, so these live as chips rather than column filters.
  deptAny: { label: 'Department, any basis', options: [] },
  deptBasis: { label: 'Derived from', options: [] },
  ownerGap: { label: 'Why there is no owner', options: [] },
  // Set by a typed question rather than picked from a list, so it lives as a chip only.
  ownerName: { label: 'Owner', options: [] },
  app: { label: 'App', options: ['Salesforce', 'HubSpot', 'Google Drive', 'Slack', 'Notion', 'Jira', 'Zendesk', 'NetSuite'] },
}
Object.entries(FILTER_DEFS).forEach(([key, def]) => {
  def.match = FILTER_MATCH[key]
})

// One menu definition, used both for a single row and for a selection, with the labels
// following the count.
function actionItems(count) {
  const out = []
  ACTION_GROUPS.forEach((group, gi) => {
    if (gi > 0) out.push({ type: 'divider' })
    out.push({
      type: 'group',
      label: group.title,
      children: group.items.map((i) => ({
        key: i.key,
        label: count === 1 && i.one ? i.one : i.label,
        danger: i.danger,
      })),
    })
  })
  out.push({ type: 'divider' })
  out.push({
    key: 'scope',
    disabled: true,
    label: <span style={{ fontSize: 12 }}>applies to {count} selected {count === 1 ? 'agent' : 'agents'}</span>,
  })
  return out
}

// Three states, and the difference between them is where the value came from: the owner's own
// record, their manager, or the people who invoke the agent when nobody owns it.
// What each column actually puts on screen, as plain text. The search box reads these, so typing
// "contractor" or "Left 12 Apr" finds the rows that show those words, and a column that is hidden
// contributes nothing: you search what you can see.
const SEARCH_TEXT = {
  name: (r) => r.name,
  dept: (r) =>
    r.dept.kind === 'suggested'
      ? `${r.dept.value} ${r.dept.confidence}% users`
      : r.dept.kind === 'inferred'
        ? `${r.dept.value} Manager`
        : r.dept.value,
  owner: (r) => (r.owner ? `${r.owner} ${r.ownerNote || ''}` : r.ownerGap === 'left' ? 'Left 12 Apr' : 'N/A'),
  risk: (r) => r.risk,
  usage: (r) => r.usage,
  lastUsed: (r) => r.lastUsed,
  status: (r) => r.status,
  manager: (r) => r.manager || 'N/A',
  ownerTitle: (r) => r.ownerTitle || 'N/A',
  ownerEmail: (r) => r.ownerEmail || 'N/A',
  ownerType: (r) => r.ownerType || 'N/A',
  ownerStatus: (r) => r.ownerStatus || 'N/A',
  created: (r) => r.created,
}

function Department({ dept }) {
  if (dept.kind === 'confirmed') {
    return (
      <Tooltip title="Read from the department on the record of the human who owns this agent.">
        <span>{dept.value}</span>
      </Tooltip>
    )
  }
  const title =
    dept.kind === 'inferred'
      ? "The owner carries no department of their own, so the value is taken from their manager's record."
      : `This agent has no owner, so its department cannot be derived from a human record. The value is inferred from the people who invoked the agent in the last 90 days: ${dept.confidence}% of them sit in ${dept.value}.`
  return (
    <Tooltip title={title}>
      <span className="dept-guess">
        {dept.value}
        <Tag style={{ marginInlineEnd: 0 }}>{dept.kind === 'inferred' ? 'Manager' : `${dept.confidence}% users`}</Tag>
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
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => { setOrder(DEFAULT_ORDER); setHidden(DEFAULT_HIDDEN) }}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export default function AgentsTable({ rows, selected, onSelected, filters, setFilters, onBulk, onAskAi }) {
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState(DEFAULT_ORDER)
  // The footer stays flat until the list actually moves under it, and settles again at the end.
  const [filterShadow, setFilterShadow] = useState(false)
  const measureFilterScroll = (el) => {
    if (!el) return
    const scrolled = el.scrollTop > 2
    const below = el.scrollHeight - el.scrollTop - el.clientHeight > 2
    const lifted = scrolled && below
    setFilterShadow((prev) => (prev === lifted ? prev : lifted))
  }
  const [hidden, setHidden] = useState(DEFAULT_HIDDEN)

  // The table filters the rows itself, so the count in the Agent header is always the count
  // of what you are actually looking at.
  const visible = useMemo(() => {
    let out = rows
    const q = query.trim().toLowerCase()
    if (q) {
      const readers = order.filter((k) => !hidden.includes(k) && SEARCH_TEXT[k]).map((k) => SEARCH_TEXT[k])
      out = out.filter((r) => readers.some((read) => String(read(r) || '').toLowerCase().includes(q)))
    }
    Object.entries(filters).forEach(([key, values]) => {
      if (!values || !values.length) return
      out = out.filter((r) => values.some((v) => FILTER_DEFS[key].match(r, v)))
    })
    return out
  }, [rows, query, filters, order, hidden])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const allOnPageless = visible.length > 0 && visible.every((r) => selectedSet.has(r.key))

  const activeChips = Object.entries(filters).flatMap(([key, values]) =>
    (values || []).map((v) => ({ key, value: v, label: `${FILTER_DEFS[key].label}: ${v}` })),
  )

  const removeChip = (key, value) =>
    setFilters({ ...filters, [key]: (filters[key] || []).filter((v) => v !== value) })

  const setFilterValues = (key, values) => setFilters({ ...filters, [key]: values })

  const filtersMenu = (
    <div className="filter-panel">
      <div className="filter-scroll" ref={measureFilterScroll} onScroll={(e) => measureFilterScroll(e.currentTarget)}>
        {Object.entries(FILTER_DEFS)
          .filter(([, def]) => def.options.length)
          .map(([key, def]) => (
            <div key={key} className="filter-group">
              <div className="filter-group-title">{def.label}</div>
              <Checkbox.Group
                value={filters[key] || []}
                onChange={(values) => setFilterValues(key, values)}
                options={def.options.map((o) => ({ label: o, value: o }))}
              />
            </div>
          ))}
      </div>
      {/* Pinned, so Clear all is never something you have to scroll to the bottom to find. */}
      <div className={`filter-foot${filterShadow ? ' lifted' : ''}`}>
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
      if (FILTER_DEFS[filterKey].search) base.filterSearch = true
      base.filteredValue = filters[filterKey] && filters[filterKey].length ? filters[filterKey] : null
      base.onFilter = () => true
    }
    if (key === 'dept') base.render = (dept) => <Department dept={dept} />
    if (key === 'owner')
      base.render = (owner, r) => {
        if (owner)
          return (
            <span>
              {owner}
              {r.ownerNote ? <span className="dept-soft"> · {r.ownerNote}</span> : null}
            </span>
          )
        // Nobody is accountable. The cell says so plainly, and the reason lives in the tooltip.
        const label = r.ownerGap === 'left' ? 'Left 12 Apr' : 'N/A'
        const why =
          r.ownerGap === 'left'
            ? 'The owner left the company on 12 April and no replacement was named.'
            : r.ownerGap === 'noHr'
              ? 'The owner exists in the application but has no record in HR, so there is nobody to hold accountable.'
              : 'This agent was created without an owner and has never been claimed.'
        return (
          <Tooltip title={why}>
            <span className="dept-soft">{label}</span>
          </Tooltip>
        )
      }
    if (key === 'lastUsed' || key === 'created') base.render = (v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span>
    // The owner's own record. Where nobody is accountable there is nothing to read, and the cell
    // says N/A rather than sitting empty and looking like a loading bug.
    if (key === 'manager' || key === 'ownerTitle' || key === 'ownerEmail' || key === 'ownerType')
      base.render = (v) => (v ? <span>{v}</span> : <span className="dept-soft">N/A</span>)
    if (key === 'ownerStatus')
      base.render = (v) => {
        if (!v) return <span className="dept-soft">N/A</span>
        if (v === 'Active') return <Tag color="green">Active</Tag>
        // Staged and pending activation are on their way in, the rest are on their way out.
        const soon = v === 'Staged' || v === 'Pending activation'
        return <Tag color={soon ? 'blue' : 'gold'}>{v}</Tag>
      }
    if (key === 'usage') base.render = (v) => <Tag color={usageColor[v] || 'default'}>{v}</Tag>
    // The level alone invites the question "on what basis", so the cell carries its own answer.
    if (key === 'risk')
      base.render = (v, r) => (
        <Tooltip title={r.riskReason}>
          <Tag {...SEVERITY_TAG[v]}>{v}</Tag>
        </Tooltip>
      )
    if (key === 'status') base.render = (v) => <Tag color={v === 'On review' ? 'blue' : 'default'}>{v}</Tag>
    if (key === 'action')
      base.render = (_, r) => (
        // One square control per row instead of the word Actions repeated down the page.
        // No tooltip: the column header already says what this opens.
        <Dropdown menu={{ items: actionItems(1), onClick: ({ key: k }) => onBulk(k, [r.key]) }} trigger={['click']}>
          <Button className="btn-muted" icon={<ChevronDownIcon />} />
        </Dropdown>
      )
    return base
  }

  const columns = order.filter((k) => !hidden.includes(k)).map(buildColumn)
  // The default set fits the width of the page. Turning extra columns on is what makes the
  // table scroll sideways, rather than squeezing every column into an unreadable width.
  const totalWidth = columns.reduce((sum, c) => sum + (c.width || 0), 0) + 44

  return (
    <div>
      <div className="toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#6b7c8c' }} />}
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
            <Button className="btn-muted" icon={<SettingOutlined />} />
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

      {/* One selected row is not a bulk operation, and it already has its own Actions control.
          The assistant needs no button here either: a picked row is attached to the composer
          the moment it is picked. */}
      {selected.length > 1 ? (
        <div className="bulkbar">
          <b>{selected.length} agents selected</b>
          <span className="toolbar-grow" />
          <Dropdown menu={{ items: actionItems(selected.length), onClick: ({ key }) => onBulk(key, selected) }}>
            <Button size="small">
              Manage in bulk <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
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
        rowSelection={{
          selectedRowKeys: selected,
          onChange: onSelected,
          preserveSelectedRowKeys: true,
          // The header box means every row the current filters return, not the page you happen
          // to be looking at, and choices made on other pages are kept.
          columnTitle: (
            <Checkbox
              checked={allOnPageless}
              indeterminate={selected.length > 0 && !allOnPageless}
              onChange={(e) => onSelected(e.target.checked ? visible.map((r) => r.key) : [])}
            />
          ),
        }}
        scroll={totalWidth > 900 ? { x: totalWidth } : undefined}
        // Clicking anywhere in a row picks it, the way a list of things you act on should behave.
        // Controls inside the row keep their own job.
        onRow={(record) => ({
          onClick: (e) => {
            if (e.target.closest('button, a, input, .ant-dropdown, .ant-table-selection-column')) return
            onSelected(
              selectedSet.has(record.key) ? selected.filter((k) => k !== record.key) : [...selected, record.key],
            )
          },
        })}
        pagination={{ pageSize: 8, showSizeChanger: false, size: 'small' }}
      />
    </div>
  )
}
