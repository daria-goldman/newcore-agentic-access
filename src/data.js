// Deterministic demo estate. Every number on the screen is generated from this file,
// so the counts in the widgets, the table and the assistant can never drift apart.

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = mulberry32(20260819)
const pick = (list) => list[Math.floor(rnd() * list.length)]

const DEPARTMENTS = ['Sales', 'Finance', 'Engineering', 'Support', 'Operations', 'Legal', 'People']
const FIRST = ['Maya', 'Noa', 'Ronen', 'Tal', 'Yael', 'Omer', 'Shira', 'Adi', 'Guy', 'Lior', 'Dana', 'Eitan', 'Roni', 'Amit', 'Hila']
const LAST = ['Ben-David', 'Katz', 'Levy', 'Shani', 'Barak', 'Avraham', 'Peretz', 'Mizrahi', 'Golan', 'Regev', 'Weiss', 'Sharon']
const VERB = ['sync', 'bot', 'agent', 'writer', 'runner', 'assistant', 'copilot', 'worker']
const NOUN = ['promo', 'campaign', 'content', 'lead', 'deal', 'invoice', 'ticket', 'report', 'meeting', 'brief', 'audit', 'renewal', 'payout', 'onboard', 'inbox']
const APPS = ['Salesforce', 'HubSpot', 'Google Drive', 'Slack', 'Notion', 'Jira', 'Zendesk', 'NetSuite']
// Usage is the gap since the agent last called a tool, named in plain words. Last used holds the
// exact date behind it, which is why the two columns sit next to each other.
const USAGE = ['Used this week', 'Idle 1 week', 'Idle 2 weeks', 'Idle 1 month', 'Idle 2 months', 'Idle 3 months', 'Idle 6 months']
// Most agents are in current use. Long silences are the interesting part, so they are present but
// rare, which is also what makes them worth flagging in red.
const USAGE_ROLL = [
  ...Array(9).fill('Used this week'),
  ...Array(4).fill('Idle 1 week'),
  ...Array(3).fill('Idle 2 weeks'),
  ...Array(2).fill('Idle 1 month'),
  'Idle 2 months',
  'Idle 3 months',
  'Idle 6 months',
]
const RISK = ['High', 'Medium', 'Low']

// The five rows drawn in the wireframe, kept verbatim so design and code agree.
const DESIGNED = [
  { name: 'meeting-prep-agent', dept: { kind: 'inferred', value: 'Marketing' }, owner: { name: 'Maya Ben-David' }, risk: 'High', usage: 'Used this week', status: 'Active', app: 'Salesforce' },
  { name: 'campaign-writer', dept: { kind: 'inferred', value: 'Marketing' }, owner: { name: 'Noa Katz' }, risk: 'Medium', usage: 'Idle 1 week', status: 'Active', app: 'HubSpot' },
  { name: 'promo-sync', dept: { kind: 'confirmed', value: 'Marketing' }, owner: { name: 'Ronen Levy', note: 'contractor' }, risk: 'High', usage: 'Used this week', status: 'On review', app: 'Salesforce' },
  { name: 'content-bot', dept: { kind: 'suggested', value: 'Marketing', confidence: 90 }, owner: null, ownerNote: 'no owner', risk: 'High', usage: 'Idle 3 months', status: 'Active', app: 'Google Drive' },
  { name: 'data-sync', dept: { kind: 'suggested', value: 'Sales', confidence: 100 }, owner: null, ownerNote: 'owner left 12 Apr', risk: 'High', usage: 'Idle 2 weeks', status: 'Active', app: 'NetSuite' },
]

export const TOTAL_AGENTS = 612

// Composition of the derived marketing set, fixed on purpose:
// 30 read straight from the owner's record, 4 taken from the owner's manager = 34 in scope,
// plus 3 candidates that could not be resolved at all because nobody owns them.
export const SET = { confirmed: 30, inferred: 4, unresolved: 3 }
export const MARKETING_IN_SCOPE = SET.confirmed + SET.inferred // 34

// Agents with nobody accountable, split by why. 92 of 612 is 15 percent: above the 8 percent
// of identities Veza measured with no HR link, and far below what the CSA survey implies for
// agents, where a third of organisations have ownership defined for only a quarter of them.
export const UNOWNED = { left: 48, noHr: 27, never: 17 }
export const UNOWNED_TOTAL = UNOWNED.left + UNOWNED.noHr + UNOWNED.never // 92

function ownerFor(i) {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`
}

// Everything the brief holds about a Human: name, email, title, department, manager, type, status.
// Department already lives on the agent row because the whole case turns on deriving it, the rest
// is built here. Profiles are memoised by name so one person never appears with two job titles
// or two managers on different rows.
const TITLES = {
  Marketing: ['Campaign Manager', 'Content Strategist', 'Growth Lead', 'Product Marketing Manager', 'Marketing Operations Manager'],
  Sales: ['Account Executive', 'Sales Manager', 'Sales Operations Analyst'],
  Finance: ['Financial Analyst', 'Controller', 'Accounts Payable Specialist'],
  Engineering: ['Software Engineer', 'Engineering Manager', 'Platform Engineer'],
  Support: ['Support Engineer', 'Support Team Lead', 'Customer Success Manager'],
  Operations: ['Operations Manager', 'Business Operations Analyst', 'Procurement Specialist'],
  Legal: ['Legal Counsel', 'Compliance Manager', 'Contracts Manager'],
  People: ['HR Business Partner', 'Recruiter', 'People Operations Manager'],
}
// A stand in company, so the estate on screen is plainly demo data and not a real domain.
const EMAIL_DOMAIN = 'northwind.com'
function hashName(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
const HUMANS = new Map()
function humanProfile(name, dept) {
  if (!name) return null
  const seen = HUMANS.get(name)
  if (seen) return seen
  const h = hashName(name)
  const titles = TITLES[dept] || TITLES.Operations
  // Most people are ordinary employees on an active record. Contractors and consultants are the
  // minority that makes Type worth a column at all, and a suspended record is rarer still.
  const typeRoll = h % 10
  let manager = ownerFor(h % 90)
  if (manager === name) manager = ownerFor((h % 90) + 5)
  const profile = {
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${EMAIL_DOMAIN}`,
    title: titles[Math.floor(h / 7) % titles.length],
    type: typeRoll < 7 ? 'Employee' : typeRoll < 9 ? 'Contractor' : 'Consultant',
    status: RARE_STATUS[HUMANS.size] || 'Active',
    manager,
  }
  HUMANS.set(name, profile)
  return profile
}
// The status values are the brief's own list for a Human: active, suspended, staged, pending
// activation, deactivated, discovered. Almost everyone is active, so the rarer states are placed
// by hand rather than rolled: a hash spreads them unevenly and can drop one of them entirely,
// and each of these three is worth seeing on screen at least once.
const RARE_STATUS = { 3: 'Suspended', 9: 'Staged', 14: 'Pending activation', 21: 'Suspended', 27: 'Staged', 33: 'Pending activation' }
// Where nobody is accountable the status still says why. An owner who left is deactivated, and
// an owner holding an account in a connected system with no HR record is exactly the brief's
// "discovered". An agent that never had an owner has no human behind it at all, so no status.
const GAP_STATUS = { left: 'Deactivated', noHr: 'Discovered', never: null }

// The demo estate is read on 19 Aug 2026, the same day the trend chart ends.
const TODAY = Date.UTC(2026, 7, 19)
const DAY = 86400000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (ts) => {
  const d = new Date(ts)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
// Last used has to agree with the Usage column, otherwise two cells in the same row
// would tell different stories.
// Each bucket sits close to the label it carries, so the tag and the Last used date next to it
// never look like they are describing two different agents.
const AGO_BY_USAGE = {
  'Used this week': [0, 6],
  'Idle 1 week': [7, 12],
  'Idle 2 weeks': [14, 20],
  'Idle 1 month': [30, 40],
  'Idle 2 months': [60, 70],
  'Idle 3 months': [92, 104],
  'Idle 6 months': [182, 196],
}
function lastUsedFor(usage, roll) {
  const [from, to] = AGO_BY_USAGE[usage] || [1, 30]
  return TODAY - (from + Math.floor(roll * (to - from))) * DAY
}
function createdFor(roll) {
  return TODAY - (120 + Math.floor(roll * 900)) * DAY
}
export const DAY_MS = DAY
export const TODAY_MS = TODAY
export const formatDate = fmt

// The five wireframe rows keep the managers they were drawn with.
const DESIGNED_MANAGERS = ['Dana Weiss', 'Eitan Regev', 'Hila Mizrahi', 'Dana Weiss', 'Guy Peretz']

// The owner's own record, flattened onto the agent row. Where nobody is accountable there is no
// record to read, so the cells say so rather than guessing.
function ownerFields(owner, dept, gap) {
  const p = humanProfile(owner, dept)
  return {
    ownerEmail: p ? p.email : null,
    ownerTitle: p ? p.title : null,
    ownerType: p ? p.type : null,
    ownerStatus: p ? p.status : GAP_STATUS[gap] || null,
  }
}

function buildAgents() {
  const rows = []
  // Seed the wireframe owners first, so a manager drawn on the wireframe also holds for any other
  // agent the same person happens to own further down the estate.
  DESIGNED.forEach((d, i) => {
    if (!d.owner) return
    const p = humanProfile(d.owner.name, d.dept.value)
    p.manager = DESIGNED_MANAGERS[i]
    // The Owner cell on the wireframe already calls this person a contractor, so Type has to agree
    // rather than quietly contradict the cell next to it.
    if (d.owner.note === 'contractor') p.type = 'Contractor'
  })
  DESIGNED.forEach((d, i) => {
    const roll = rnd()
    rows.push({
      key: `a${i}`,
      name: d.name,
      // The manager of the person who owned this agent. Where nobody owns it, this is the
      // closest human a request can still reach, which is what the owner request is sent to.
      manager: DESIGNED_MANAGERS[i],
      lastUsedTs: lastUsedFor(d.usage, roll),
      createdTs: createdFor(rnd()),
      dept: d.dept,
      owner: d.owner ? d.owner.name : null,
      ownerNote: d.owner ? d.owner.note : d.ownerNote,
      ownerGap: d.owner ? null : i === 3 ? 'never' : 'left',
      risk: d.risk,
      usage: d.usage,
      status: d.status,
      app: d.app,
      ...ownerFields(d.owner ? d.owner.name : null, d.dept.value, d.owner ? null : i === 3 ? 'never' : 'left'),
      inScope: d.dept.kind !== 'suggested' && d.dept.value === 'Marketing',
      unresolved: d.dept.kind === 'suggested' && d.dept.value === 'Marketing',
    })
  })

  // Still to generate after the five designed rows.
  let confirmed = SET.confirmed - 1
  let inferred = SET.inferred - 2
  // Nobody accountable: 11 in total, and three of them are marketing candidates.
  const gaps = [
    ...Array(UNOWNED.left - 1).fill('left'),
    ...Array(UNOWNED.noHr).fill('noHr'),
    ...Array(UNOWNED.never - 1).fill('never'),
  ]
  const GAP_NOTE = { left: 'owner left 12 Apr', noHr: 'owner has no HR record', never: 'never had an owner' }
  // two more marketing candidates among the unowned, content-bot is the third
  const gapIsMarketing = new Set([0, 5])

  let n = rows.length
  let gapIndex = 0
  const used = new Set(rows.map((r) => r.name))
  while (rows.length < TOTAL_AGENTS) {
    let name = `${pick(NOUN)}-${pick(VERB)}`
    if (used.has(name)) name = `${name}-${rows.length}`
    used.add(name)

    let dept
    let owner = ownerFor(n)
    let ownerNote = null
    let ownerGap = null

    if (confirmed > 0) {
      dept = { kind: 'confirmed', value: 'Marketing' }
      confirmed--
    } else if (inferred > 0) {
      dept = { kind: 'inferred', value: 'Marketing' }
      inferred--
    } else if (gapIndex < gaps.length) {
      const marketing = gapIsMarketing.has(gapIndex)
      ownerGap = gaps[gapIndex]
      dept = {
        kind: 'suggested',
        value: marketing ? 'Marketing' : pick(DEPARTMENTS),
        confidence: marketing ? 70 + Math.floor(rnd() * 25) : 60 + Math.floor(rnd() * 35),
      }
      owner = null
      ownerNote = GAP_NOTE[ownerGap]
      gapIndex++
    } else {
      dept = { kind: 'confirmed', value: pick(DEPARTMENTS) }
    }

    const roll = rnd()
    // Consumed but unused. The sponsor field it used to fill is gone, and keeping the draw keeps
    // the rest of the generated estate identical to what the screenshots and the case describe.
    rnd()
    const usage = pick(USAGE_ROLL)
    rows.push({
      key: `a${n}`,
      name,
      dept,
      owner,
      manager: owner ? humanProfile(owner, dept.value).manager : ownerFor(Math.floor(n / 4) + 11),
      lastUsedTs: lastUsedFor(usage, rnd()),
      createdTs: createdFor(rnd()),
      ownerNote,
      ownerGap,
      ...ownerFields(owner, dept.value, ownerGap),
      risk: roll < 0.1 ? 'High' : roll < 0.42 ? 'Medium' : 'Low',
      usage,
      status: rnd() < 0.06 ? 'On review' : 'Active',
      app: pick(APPS),
      inScope: dept.kind !== 'suggested' && dept.value === 'Marketing',
      unresolved: dept.kind === 'suggested' && dept.value === 'Marketing',
    })
    n++
  }
  return rows
}

// Targets for the whole estate. Shares follow the same split the wireframe carried, only now
// they are produced by counting agents rather than written down.
const VIOLATION_TARGETS = { excess: 134, path: 67, outside: 61 }
const THREAT_TARGETS = { admin: 11, unapproved: 9, prompt: 6 }
const SEVERITY_MIX = {
  excess: ['Critical', 'High', 'High', 'Medium', 'Medium', 'Medium', 'Low', 'Low'],
  owner: ['Critical', 'High', 'High', 'Medium', 'Medium', 'Medium', 'Low', 'Low'],
  path: ['Critical', 'High', 'Medium', 'Medium', 'Medium', 'Low'],
  outside: ['Critical', 'High', 'High', 'Medium', 'Medium', 'Low', 'Low'],
}

function withViolations(rows) {
  const severityFor = (type, i) => SEVERITY_MIX[type][i % SEVERITY_MIX[type].length]
  const add = (agent, type, i) => {
    agent.violations.push({ type, severity: severityFor(type, i) })
  }
  rows.forEach((a) => {
    a.violations = []
    a.threats = []
  })

  // Every agent nobody owns carries the ownership violation, so the widget and the table can
  // never disagree: both count the same rows.
  let n = 0
  rows.forEach((a) => {
    if (!a.owner) add(a, 'owner', n++)
  })

  // The weak path belongs to the marketing set first, MKT-01 is one of the eight policies.
  const marketing = rows.filter((a) => a.inScope)
  const others = rows.filter((a) => !a.inScope)
  const pathAgents = [...marketing, ...others.slice(0, VIOLATION_TARGETS.path - marketing.length)]
  pathAgents.forEach((a, i) => add(a, 'path', i))

  const pool = (skip, count) => others.slice(skip, skip + count)
  pool(120, VIOLATION_TARGETS.excess).forEach((a, i) => add(a, 'excess', i))
  pool(300, VIOLATION_TARGETS.outside).forEach((a, i) => add(a, 'outside', i))

  pool(40, THREAT_TARGETS.admin).forEach((a) => a.threats.push('admin'))
  pool(60, THREAT_TARGETS.unapproved).forEach((a) => a.threats.push('unapproved'))
  pool(80, THREAT_TARGETS.prompt).forEach((a) => a.threats.push('prompt'))
  return rows
}

export const AGENTS = withViolations(
  buildAgents().map((a) => ({
    ...a,
    lastUsed: fmt(a.lastUsedTs),
    created: fmt(a.createdTs),
  })),
)

// Everything the widgets show is derived from the estate above, so applying a change moves
// the numbers instead of leaving them frozen.
export function computeStats(agents) {
  const byType = VIOLATION_TYPES.map((t) => ({ ...t, count: 0 }))
  const bySeverity = SEVERITIES.map((s) => ({ label: s.key, color: s.color, count: 0 }))
  let open = 0
  agents.forEach((a) => {
    a.violations.forEach((v) => {
      open++
      const t = byType.find((x) => x.key === v.type)
      if (t) t.count++
      const s = bySeverity.find((x) => x.label === v.severity)
      if (s) s.count++
    })
  })
  const withType = (key) => agents.filter((a) => a.violations.some((v) => v.type === key)).length
  const unowned = { left: 0, noHr: 0, never: 0 }
  agents.forEach((a) => {
    if (!a.owner && a.ownerGap) unowned[a.ownerGap]++
  })
  const threats = THREAT_TYPES.map((t) => ({
    ...t,
    count: agents.filter((a) => a.threats.includes(t.key)).length,
  }))
  return {
    open,
    byType: byType.map((t) => ({ ...t, share: open ? Math.round((t.count / open) * 100) : 0 })),
    bySeverity,
    threats,
    threatTotal: threats.reduce((sum, t) => sum + t.count, 0),
    unowned: { ...unowned, total: unowned.left + unowned.noHr + unowned.never },
    weakPath: withType('path'),
    marketingInScope: agents.filter((a) => a.inScope).length,
  }
}

// What each finding actually clears when it is applied.
export const FIX_EFFECTS = {
  f1: { violation: 'excess', agents: 12 },
  f2: { violation: 'excess', agents: 4, threat: 'admin' },
  f3: { violation: 'path', agents: 34 },
  f4: { violation: 'outside', agents: 6 },
  f5: { violation: 'excess', agents: 2 },
  f6: { violation: 'excess', agents: 5 },
  f7: { threat: 'prompt', agents: 1 },
  t1: { violation: 'outside', agents: 3, threat: 'unapproved' },
  o2: { violation: 'excess', agents: 12 },
  o3: { violation: 'owner', agents: 5 },
  p2: { violation: 'path', agents: 33 },
}

// Some findings are defined by who they touch rather than by a violation type.
const IMPACT_RULES = {
  f8: (a) => a.dept.kind === 'suggested' && a.dept.value === 'Marketing',
  o1: (a) => a.ownerGap === 'left',
  o3: (a) => a.ownerGap === 'never',
}

// The list behind the cost line: exactly which agents a change would reach, taken from the
// same estate the table shows.
export function affectedAgents(agents, findingId) {
  const finding = ALL_FINDINGS.find((f) => f.id === findingId)
  const rule = IMPACT_RULES[findingId]
  if (rule) return agents.filter(rule).slice(0, finding ? finding.scope : 100)
  const effect = FIX_EFFECTS[findingId]
  if (!effect) return []
  const match = effect.violation
    ? (a) => a.violations.some((v) => v.type === effect.violation)
    : (a) => a.threats.includes(effect.threat)
  return agents.filter(match).slice(0, effect.agents)
}

// Applying is a real edit of the estate: the violations it names are removed from that many
// agents, and every widget recounts.
export function applyFixes(agents, findingIds) {
  const effects = findingIds.map((id) => FIX_EFFECTS[id]).filter(Boolean)
  if (!effects.length) return agents
  const budget = new Map()
  const threatBudget = new Map()
  effects.forEach((e) => {
    if (e.violation) budget.set(e.violation, (budget.get(e.violation) || 0) + e.agents)
    if (e.threat) threatBudget.set(e.threat, (threatBudget.get(e.threat) || 0) + e.agents)
  })
  return agents.map((a) => {
    let violations = a.violations
    let threats = a.threats
    violations = violations.filter((v) => {
      const left = budget.get(v.type) || 0
      if (left > 0) {
        budget.set(v.type, left - 1)
        return false
      }
      return true
    })
    threats = threats.filter((t) => {
      const left = threatBudget.get(t) || 0
      if (left > 0) {
        threatBudget.set(t, left - 1)
        return false
      }
      return true
    })
    return violations === a.violations && threats === a.threats ? a : { ...a, violations, threats }
  })
}
export const MARKETING_AGENTS = AGENTS.filter((a) => a.inScope)
export const UNRESOLVED_AGENTS = AGENTS.filter((a) => a.unresolved)
export const UNOWNED_AGENTS = AGENTS.filter((a) => !a.owner)

export const VIOLATION_TYPES = [
  { key: 'excess', label: 'Excessive permissions', color: '#1677ff' },
  { key: 'owner', label: 'No accountable owner', color: '#69b1ff' },
  { key: 'path', label: 'Weak policy path', color: '#91caff' },
  { key: 'outside', label: 'Outside policy', color: '#d9d9d9' },
]

export const SEVERITIES = [
  { key: 'Critical', color: '#cf1322' },
  { key: 'High', color: '#fa8c16' },
  { key: 'Medium', color: '#faad14' },
  { key: 'Low', color: '#d9d9d9' },
]

export const THREAT_TYPES = [
  { key: 'admin', severity: 'Critical', label: 'Agent used admin-level access' },
  { key: 'unapproved', severity: 'High', label: 'Agent reached an unapproved app' },
  { key: 'prompt', severity: 'Medium', label: 'Prompt-exposed credential' },
]

// Ten readings between 19 May and 11 Aug 2026, so every point on the chart has a real date.
const TREND_OPEN = [21, 23, 24, 27, 29, 33, 36, 39, 41, 43]
const TREND_RESOLVED = [12, 13, 13, 15, 16, 18, 21, 25, 29, 32]
const TREND_START = Date.UTC(2026, 4, 19)
const TREND_END = Date.UTC(2026, 7, 11)
const shortDate = (ts) => {
  const d = new Date(ts)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
export const TREND = {
  points: TREND_OPEN.map((open, i) => ({
    date: shortDate(TREND_START + ((TREND_END - TREND_START) * i) / (TREND_OPEN.length - 1)),
    open,
    resolved: TREND_RESOLVED[i],
  })),
  tickIndexes: [0, 3, 6, 9],
  delta: TREND_OPEN[TREND_OPEN.length - 1] - TREND_OPEN[0],
}

const S0 = computeStats(AGENTS)
export const OPEN_FINDINGS = S0.open

// What the assistant proposes on an untouched page.
export const SUGGESTIONS = [
  { id: 'harden', title: 'Harden access for marketing agents', sub: '34 agents, 8 findings across 4 apps and 2 policies' },
  {
    id: 'owners',
    title: `Find an owner for ${UNOWNED_TOTAL} agents`,
    sub: `${UNOWNED.left} owners left the company, ${UNOWNED.noHr} have no HR record`,
  },
  { id: 'path', title: 'Remove the weak path from MKT-01', sub: 'password + OTP is the only path an agent can take' },
]

// The eight findings behind the first suggestion. Every one carries its basis and its price.
export const FINDINGS = [
  {
    id: 'f1',
    title: 'Move write tools to ask on 12 agents',
    where: 'Salesforce',
    basis: 'The profile allows create and update. None of the 12 agents called a write tool in the last 90 days.',
    cost: '4 scheduled workflows will pause for a human on their next write.',
    scope: 12,
    approval: false,
    on: true,
  },
  {
    id: 'f2',
    title: 'Revoke admin-level access from 4 agents',
    where: 'HubSpot',
    basis: 'Admin profile assigned through a group. No admin call in 90 days.',
    cost: 'Nothing observed depends on it.',
    scope: 4,
    approval: false,
    on: true,
  },
  {
    id: 'f3',
    title: 'Remove the weak path from MKT-01',
    where: 'Policy MKT-01',
    basis: 'The policy accepts a security key, but an agent can only present password and OTP, so every agent enters through the weakest path.',
    cost: 'All 34 agents must move to a workload credential. Applies at the next token refresh.',
    scope: 34,
    approval: true,
    on: true,
  },
  {
    id: 'f4',
    title: 'Remove access outside policy for 6 agents',
    where: 'Google Drive',
    basis: 'Reached from an app that is not listed in the policy for their department.',
    cost: '1 agent posts a weekly report from that folder and will fail until an owner approves.',
    scope: 6,
    approval: true,
    on: true,
  },
  {
    id: 'f5',
    title: 'Split one shared credential between 2 agents',
    where: 'Slack',
    basis: 'Two agents authenticate with the same secret, so their actions cannot be told apart.',
    cost: 'Both agents restart once during the swap.',
    scope: 2,
    approval: false,
    on: true,
  },
  {
    id: 'f6',
    title: 'Trim tools never called on 5 agents',
    where: '3 apps',
    basis: 'Tools present in the profile with no call in the last 90 days.',
    cost: 'Nothing observed depends on them.',
    scope: 5,
    approval: false,
    on: true,
  },
  {
    id: 'f7',
    title: 'Rotate a prompt-exposed credential',
    where: 'Policy MKT-02',
    basis: 'The credential appeared in a prompt log on 11 Aug.',
    cost: 'The agent is unavailable for about a minute.',
    scope: 1,
    approval: false,
    on: true,
  },
  {
    id: 'f8',
    title: 'Request owner confirmation for 3 agents',
    where: 'Ownership',
    basis: 'Their department was guessed from the people who call them, not derived from an owner, so the set cannot be trusted for them.',
    cost: 'Nothing changes until a person answers.',
    scope: 3,
    approval: true,
    on: true,
    email: true,
  },
]

// The action set worked out against the competitor recordings and screenshots, grouped the way
// the wireframe fixed it. Nothing here is a guess: every item appeared in at least one product,
// except "Move write tools to ask", which comes from the ask fallback in the brief.
export const ACTION_GROUPS = [
  {
    title: 'Ownership',
    items: [
      { key: 'assign', label: 'Assign an owner' },
      { key: 'confirm', label: 'Request owner confirmation' },
      { key: 'message', label: 'Send email or Slack message' },
    ],
  },
  {
    title: 'Access',
    items: [
      { key: 'sessions', label: 'Revoke active sessions and tokens' },
      { key: 'ask', label: 'Move write tools to ask' },
      { key: 'policy', label: 'Apply a policy' },
    ],
  },
  {
    title: 'Lifecycle',
    items: [
      { key: 'suspend', label: 'Suspend agents', one: 'Suspend agent' },
      { key: 'decommission', label: 'Decommission agents', one: 'Decommission agent', danger: true },
    ],
  },
  {
    title: 'Evidence',
    items: [{ key: 'export', label: 'Export selection' }],
  },
]

export const ACTION_LABELS = Object.fromEntries(
  ACTION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])),
)

// Findings that belong to the smaller widget scenarios.
export const EXTRA_FINDINGS = [
  {
    id: 't1',
    title: 'Block the unapproved app for 3 agents',
    where: 'Notion',
    basis: 'The app is not listed in the policy for their department and was reached 14 times in 5 days.',
    cost: '1 agent writes a weekly digest there and will fail until the app is approved or the tool is removed.',
    scope: 3,
    approval: true,
    on: true,
  },
  {
    id: 'o1',
    title: `Ask the manager of each departed owner`,
    where: 'Ownership',
    basis: `${UNOWNED.left} agents lost their owner when the person left. Their manager is the closest human who can name a new one.`,
    cost: 'Nothing changes until a person answers.',
    scope: UNOWNED.left,
    approval: true,
    on: true,
    email: true,
  },
  {
    id: 'o2',
    title: 'Move write tools to ask on 12 idle agents',
    where: '3 apps',
    basis: 'No owner and no call in more than 2 months, so a wrong write would have nobody to answer for it.',
    cost: 'If one of them wakes up, its first write waits for a human. Reversible.',
    scope: 12,
    approval: false,
    on: true,
  },
  {
    id: 'o3',
    title: 'Decommission 5 agents that never had an owner',
    where: 'Salesforce, Jira',
    basis: 'Created by a person who never appeared in HR, no call in 6 months.',
    cost: 'This one is hard to undo. Credentials are revoked and the runtime is stopped.',
    scope: 5,
    approval: true,
    on: false,
    offReason: 'Off by default, because it is the only change here that cannot be rolled back.',
  },
  {
    id: 'p2',
    title: 'Move 7 more policies to a workload credential',
    where: '7 policies',
    basis: 'Same shape as MKT-01: a strong path exists but no agent can present it.',
    cost: 'Each policy needs its app owner to confirm before the next token refresh.',
    scope: 7,
    approval: true,
    on: false,
    offReason: 'Off by default, because seven app owners have to confirm, which makes it its own campaign.',
  },
]

export const ALL_FINDINGS = [...FINDINGS, ...EXTRA_FINDINGS]

// One object per subject the assistant can be asked about.
export const SCENARIOS = {
  harden: {
    title: 'Harden access for marketing agents',
    reading: [
      'No agent carries a department, so I follow each agent to its owner.',
      `${TOTAL_AGENTS} agents checked, ${MARKETING_IN_SCOPE} belong to someone in Marketing.`,
      '3 more are called mostly by Marketing, but nobody owns them, so they cannot be placed.',
    ],
    setTitle: `${MARKETING_IN_SCOPE} agents in scope`,
    setNote: 'There is no department on an agent. This set is built through the human who owns it.',
    rows: [
      ['Read from the owner record', SET.confirmed, 'the owner carries Marketing on their own record'],
      ['Taken from the manager', SET.inferred, 'the owner has no department, so the value comes from their manager'],
    ],
    blind:
      '3 agents could not be placed. Nobody owns them, so their department is only a guess from the people who call them. They stay out of this change and become their own task.',
    // The blind spot has to be checkable, not just stated.
    blindFilter: { owner: ['No owner'], guess: ['Marketing'] },
    blindFilterLabel: 'Show the 3 in the table',
    findings: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'],
    scope: 'marketing',
    blindNote: '3 agents were never checked. Nobody owns them, so they were left out of this change and now sit in their own task.',
  },
  threats: {
    title: 'Threats detected in the last 5 days',
    reading: [
      `${S0.threatTotal} threats in 5 days, grouped by what caused them.`,
      `They come from ${S0.threatTotal} agents, and a quarter of those sit in one team.`,
    ],
    setTitle: `${S0.threatTotal} threats from ${S0.threatTotal} agents`,
    setNote: 'A threat is an event that already happened, so the question is what to change now.',
    rows: [
      ['Agent used admin-level access', S0.threats[0].count, 'admin profile assigned through a group'],
      ['Agent reached an unapproved app', S0.threats[1].count, 'app missing from the policy of that department'],
      ['Prompt-exposed credential', S0.threats[2].count, 'the secret appeared in a prompt log'],
    ],
    blind: 'Some of these agents have no owner, so there is nobody to approve a change that breaks their work.',
    findings: ['f2', 't1', 'f7'],
    blindNote: 'The agents among these that have no owner are still open, nobody can approve a change on them.',
  },
  severity: {
    title: `${S0.open} open violations`,
    reading: [
      `${S0.open} open violations, ordered by what it takes to close them.`,
      'A third of them sit on three policies, so three changes cover a large part of the list.',
    ],
    setTitle: `${S0.open} open violations`,
    setNote: 'Severity says how loud a violation is, not how hard it is to close. This set is ordered by the second one.',
    rows: [
      ['Critical', S0.bySeverity[0].count, 'admin access and an exposed credential'],
      ['High', S0.bySeverity[1].count, 'write tools nobody uses'],
      ['Medium', S0.bySeverity[2].count, 'access outside policy'],
      ['Low', S0.bySeverity[3].count, 'unused tools inside the profile'],
    ],
    blind: `The ${S0.bySeverity[3].count} low violations are not touched here. They stay in the queue with their reason attached.`,
    findings: ['f3', 'f1', 'f4'],
    blindNote: `${S0.bySeverity[3].count} low violations were left in the queue on purpose.`,
  },
  type: {
    title: 'Violations by type',
    reading: ['Grouped by what is wrong, not by how loud it is.', 'Excessive permissions is the largest group at 38 percent.'],
    setTitle: `${S0.open} violations in 4 groups`,
    setNote: 'Type tells you which change closes a whole group at once.',
    rows: [
      ['Excessive permissions', S0.byType[0].count, 'tools in the profile with no call in 90 days'],
      ['No accountable owner', S0.byType[1].count, 'nobody answers for the agent'],
      ['Weak policy path', S0.byType[2].count, 'the agent can only take the weakest path'],
      ['Outside policy', S0.byType[3].count, 'reached an app the policy does not list'],
    ],
    blind: 'Outside policy findings need the app owner to answer, so they cannot all be closed from this screen.',
    findings: ['f1', 'f6', 'f4'],
    blindNote: 'Outside policy findings wait on app owners and are not closed here.',
  },
  owners: {
    title: `Find an owner for ${UNOWNED_TOTAL} agents`,
    reading: [
      `${UNOWNED_TOTAL} agents have nobody accountable.`,
      `For ${UNOWNED.left} of them the owner left the company, so their manager is the closest human.`,
    ],
    setTitle: `${UNOWNED_TOTAL} agents without an owner`,
    setNote: 'Ownership is the field everything else hangs on. Without it a department cannot be derived and an approval has nobody to go to.',
    rows: [
      ['Owner left the company', UNOWNED.left, 'the human record is gone, the manager remains'],
      ['Owner has no HR record', UNOWNED.noHr, 'the owner exists in the app but not in HR'],
      ['Never had an owner', UNOWNED.never, 'created without an owner and never claimed'],
    ],
    blind: `3 of these ${UNOWNED_TOTAL} are also the agents that could not be placed in any department.`,
    blindFilter: { owner: ['No owner'], guess: ['Marketing'] },
    blindFilterLabel: 'Show those 3 in the table',
    findings: ['o1', 'o2', 'o3'],
    scope: 'unowned',
    blindNote: `3 of the ${UNOWNED_TOTAL} are still unplaced in any department until a person answers.`,
  },
  path: {
    title: 'Remove the weak path from MKT-01',
    reading: ['A policy accepts several ways in and any one of them is enough.', 'An agent has no phone and no inbox, so it can only take the weakest one.'],
    setTitle: `8 policies with a weaker agent path, ${S0.weakPath} agents`,
    setNote: 'The policy looks strong because it lists a security key. No agent can present one.',
    rows: [
      ['Agents on MKT-01', MARKETING_IN_SCOPE, 'all of them sign in with password and OTP'],
      ['Agents on the other 7 policies', S0.weakPath - MARKETING_IN_SCOPE, 'same shape, a strong path no agent can present'],
    ],
    blind: '2 of the 8 policies are managed outside NewCore, so they can be flagged here but not changed.',
    findings: ['f3', 'p2'],
    scope: 'marketing',
    blindNote: '2 policies are managed outside NewCore and were only flagged.',
  },
}

export const WIDGET_TO_SCENARIO = {
  'Threats detected': 'threats',
  'Violations by severity': 'severity',
  'Violations by type': 'type',
  'No accountable owner': 'owners',
  'Weak authentication path': 'path',
}
