import { AGENTS, DAY_MS, THREAT_TYPES, TODAY_MS } from './data.js'

const DEPARTMENTS = ['Marketing', 'Sales', 'Finance', 'Engineering', 'Support', 'Operations', 'Legal', 'People']

// The interface is in English, the person in front of it may not be. Same rules, two vocabularies.
const RU_DEPARTMENTS = [
  [/маркетинг/, 'Marketing'],
  [/продаж|сейлз/, 'Sales'],
  [/финанс/, 'Finance'],
  [/инженер|разработ/, 'Engineering'],
  [/поддержк/, 'Support'],
  [/операц/, 'Operations'],
  [/юрид|легал/, 'Legal'],
  [/персонал|кадр/, 'People'],
]

// A small, honest parser. It turns plain words into the same filters the admin could have set by
// hand, and says so when it understood nothing. No model behind it, so it never invents a filter.
// Names of the people and the apps that actually exist in this estate. Built once, so the parser
// can recognise "agents owned by Noa Katz" without anyone maintaining a list.
const OWNER_NAMES = [...new Set(AGENTS.map((a) => a.owner).filter(Boolean))]
const APP_NAMES = [...new Set(AGENTS.map((a) => a.app).filter(Boolean))]
const LAST_NAMES = (() => {
  const counts = {}
  OWNER_NAMES.forEach((n) => {
    const last = n.split(' ').slice(1).join(' ').toLowerCase()
    counts[last] = (counts[last] || 0) + 1
  })
  return counts
})()

function matchOwners(t) {
  const hits = OWNER_NAMES.filter((n) => t.includes(n.toLowerCase()))
  if (hits.length) return hits
  // A surname only counts when it points at exactly one person in the estate.
  return OWNER_NAMES.filter((n) => {
    const last = n.split(' ').slice(1).join(' ').toLowerCase()
    return last && LAST_NAMES[last] === 1 && t.includes(` ${last} `)
  })
}

export function parseQuery(text) {
  const t = ` ${text.toLowerCase()} `
  const filters = {}
  const add = (key, value) => {
    if (!filters[key]) filters[key] = []
    if (!filters[key].includes(value)) filters[key].push(value)
  }

  matchOwners(t).forEach((n) => add('ownerName', n))
  APP_NAMES.forEach((app) => {
    if (t.includes(app.toLowerCase())) add('app', app)
  })
  DEPARTMENTS.forEach((d) => {
    // Whole word only, otherwise "Salesforce" would be read as the Sales department.
    if (new RegExp(`\\b${d.toLowerCase()}\\b`).test(t)) add('dept', d)
  })
  RU_DEPARTMENTS.forEach(([re, d]) => {
    if (re.test(t)) add('dept', d)
  })
  if (/not derived|unplaced|no department|unknown department|не определ|неопознан|без департамент/.test(t))
    add('dept', 'Not derived')

  if (
    /no owner|without an owner|unowned|nobody owns|owned by nobody|owned by no one|owner left|no accountable|нет владельц|без владельц|нет ответственн|без ответственн|бесхозн/.test(
      t,
    )
  )
    add('owner', 'No owner')
  else if (!filters.ownerName && /has an owner|owned by|с владельц|есть владелец/.test(t))
    add('owner', 'Has an owner')

  if (/critical|критич/.test(t)) add('risk', 'Critical')
  if (/high risk|\bhigh\b|высок/.test(t)) add('risk', 'High')
  if (/medium risk|\bmedium\b|средн/.test(t)) add('risk', 'Medium')
  if (/low risk|\blow\b|низк/.test(t)) add('risk', 'Low')

  if (/on review|in review|under review|на проверк/.test(t)) add('status', 'On review')
  else if (/\bactive\b|активн/.test(t)) add('status', 'Active')

  // Idle means a month or more of silence. The shorter gaps are normal operation, not a finding.
  if (/idle|unused|not used|dormant|never used|простаива|не использ|неактивн|спящ/.test(t)) {
    add('usage', 'Idle 1 month')
    add('usage', 'Idle 2 months')
    add('usage', 'Idle 3 months')
    add('usage', 'Idle 6 months')
  }
  if (/used this week|active this week|на этой неделе/.test(t)) add('usage', 'Used this week')

  if (/contractor|подрядчик/.test(t)) add('ownerType', 'Contractor')
  if (/consultant|консультант/.test(t)) add('ownerType', 'Consultant')
  if (/suspended owner|owner is suspended|владелец заблокир/.test(t)) add('ownerStatus', 'Suspended')
  if (/discovered|no hr record|нет записи в hr|нет hr/.test(t)) add('ownerStatus', 'Discovered')
  if (/staged/.test(t)) add('ownerStatus', 'Staged')
  if (/pending activation/.test(t)) add('ownerStatus', 'Pending activation')

  if (/last used today|used today/.test(t)) add('lastUsed', 'Today')
  if (/this week/.test(t)) add('lastUsed', 'This week')
  if (/older than 3 months|not used in 3 months|3 months/.test(t)) add('lastUsed', 'Older than 3 months')
  if (/created this year|new agents/.test(t)) add('created', 'This year')
  if (/older than a year/.test(t)) add('created', 'Older than a year')

  return filters
}

// Commands about the table itself, not about which agents to find.
export function isClearCommand(text) {
  const t = ` ${text.toLowerCase()} `
  const clears = /(clear|remove|reset|drop|убери|убрать|сбрось|сбросить|очисти|очистить|сними|снять)/.test(t)
  const target = /(filter|фильтр)/.test(t)
  const showAll = /(show|покажи)\s+(me\s+)?(all|every|всех|все)\s+(agents|агент)/.test(t)
  return (clears && target) || showAll
}

export const FILTER_MATCH = {
  dept: (r, v) => (v === 'Not derived' ? r.dept.kind === 'suggested' : r.dept.kind !== 'suggested' && r.dept.value === v),
  owner: (r, v) => (v === 'No owner' ? !r.owner : !!r.owner),
  risk: (r, v) => r.risk === v,
  usage: (r, v) => r.usage === v,
  status: (r, v) => r.status === v,
  ownerType: (r, v) => (r.ownerType || 'N/A') === v,
  ownerStatus: (r, v) => (r.ownerStatus || 'N/A') === v,
  guess: (r, v) => r.dept.kind === 'suggested' && r.dept.value === v,
  ownerName: (r, v) => r.owner === v,
  app: (r, v) => r.app === v,
  lastUsed: (r, v) =>
    v === 'Today'
      ? r.lastUsedTs >= TODAY_MS - DAY_MS
      : v === 'This week'
        ? r.lastUsedTs >= TODAY_MS - 7 * DAY_MS
        : v === 'This month'
          ? r.lastUsedTs >= TODAY_MS - 31 * DAY_MS
          : r.lastUsedTs < TODAY_MS - 90 * DAY_MS,
  created: (r, v) =>
    v === 'Last 30 days'
      ? r.createdTs >= TODAY_MS - 30 * DAY_MS
      : v === 'This year'
        ? r.createdTs >= Date.UTC(2026, 0, 1)
        : r.createdTs < TODAY_MS - 365 * DAY_MS,
}

export function countMatching(filters) {
  return AGENTS.filter((r) =>
    Object.entries(filters).every(([key, values]) => !values.length || values.some((v) => FILTER_MATCH[key](r, v))),
  ).length
}

// Questions the prototype can answer without a model, taken from what the screen already knows.
const ANSWERS = [
  {
    test: /why.*(decommission|disabled|off|switched off)/,
    text: 'Decommission is the only change here that is hard to undo: credentials are revoked and the runtime is stopped. It stays off until you turn it on, and it asks the owner first. Everything else in this list is reversible, which is why those are on.',
  },
  {
    test: /why.*(approval|owner approves)/,
    text: 'Approval is asked only where the change alters how an agent actually works. Removing a permission nobody used in 90 days does not, so it applies on your decision and the owner is told. Moving a policy path does, so it waits for a person.',
  },
  {
    test: /(where|how).*(department|marketing).*(come|derive|from)|how did you (get|build) (the )?set/,
    text: 'An agent has no department. I follow each agent to the human who owns it and read the department from that person. Where the owner has none, I take their manager. Where nobody owns the agent, the department stays a guess and the agent is left out of the set.',
  },
  {
    test: /what.*(not|never).*(check|cover)|blind spot/,
    text: 'Three agents nobody owns were never checked, and anything managed outside NewCore can only be flagged. Both are stated in the result on purpose, so a confident summary never covers an untouched corner.',
  },
]

export function answerFor(text) {
  const t = text.toLowerCase()
  const hit = ANSWERS.find((a) => a.test.test(t))
  return hit ? hit.text : null
}

// When a query returns nothing, the reason is usually the data model, not a typo.
export function explain(filters, count) {
  if (count > 0) return null
  const noOwner = (filters.owner || []).includes('No owner')
  const hasDept = (filters.dept || []).some((d) => d !== 'Not derived')
  if (noOwner && hasDept) {
    const dept = (filters.dept || []).find((d) => d !== 'Not derived')
    const guessed = countMatching({ owner: ['No owner'], guess: [dept] })
    return {
      note: `Nothing matches, and that is the point. A department is read from the human who owns the agent, so an agent with no owner cannot carry one. What exists instead is a guess from the people who call it, and ${guessed} of the unowned agents are called mostly by ${dept}.`,
      suggestion: { owner: ['No owner'], guess: [dept] },
      suggestionLabel: `Show the ${guessed} guessed as ${dept}`,
    }
  }
  return { note: 'Nothing matches this combination. Try removing one of the filters.', suggestion: null }
}

// One place that turns a typed request about the table into a result, used both when a request
// opens a new chat and when it continues one that is already going.
// The six widgets on the page are the six things the assistant already knows how to work
// through. A typed request that names one of them opens that piece of work, instead of falling
// through to the marketing scenario because it was the default. The phrases here are the ones
// with no filter equivalent, so a literal request like "agents with no owner" still goes to the
// table rather than being swallowed by a scenario.
const SCENARIO_PHRASES = [
  ['harden', /harden|tighten|ужесточ|усил/],
  ['path', /weak(est)? (policy |authentication |auth )?path|mkt-01|слаб\w* пут/],
  ['threats', /threat|admin.level|unapproved app|prompt.exposed|угроз/],
  ['severity', /by severity|severity breakdown|how severe|по серьёзност|по серьезност/],
  ['type', /by type|violation type|excessive permission|outside policy|по типу/],
  ['owners', /accountable owner|find an owner|ответственн\w* владел/],
]
export function matchScenario(text) {
  const t = text.toLowerCase()
  const hit = SCENARIO_PHRASES.find(([, re]) => re.test(t))
  return hit ? hit[0] : null
}

// A question about violations and a filter over agents count different things. The severity
// widget counts findings, the table counts the agents carrying them, and one agent can carry
// several. Rather than let the two numbers look like a bug, the answer names the unit it used.
const THREAT_SEVERITY = Object.fromEntries(THREAT_TYPES.map((t) => [t.key, t.severity]))
const COUNTS_FINDINGS = /violation|finding|issue|threat|нарушен|находк|проблем|угроз/
function unitNote(text, parsed, count) {
  const level = (parsed.risk || [])[0]
  if (!level || !COUNTS_FINDINGS.test(text.toLowerCase())) return null
  let violations = 0
  let threats = 0
  AGENTS.forEach((a) => {
    a.violations.forEach((v) => {
      if (v.severity === level) violations++
    })
    a.threats.forEach((t) => {
      if (THREAT_SEVERITY[t] === level) threats++
    })
  })
  const word = level.toLowerCase()
  const findings = threats
    ? `${violations} ${word} violations and ${threats} ${word} threats are open`
    : `${violations} ${word} violations are open`
  return `You asked about findings, the table holds agents. ${findings}, and they sit on these ${count} agents, because one agent can carry more than one.`
}

export function tableRequest(text) {
  const cleared = isClearCommand(text)
  const parsed = cleared ? {} : parseQuery(text)
  const count = cleared ? countMatching({}) : Object.keys(parsed).length ? countMatching(parsed) : null
  return {
    parsed,
    count,
    cleared,
    explanation: cleared || count === null ? null : explain(parsed, count),
    unit: cleared || count === null ? null : unitNote(text, parsed, count),
  }
}
