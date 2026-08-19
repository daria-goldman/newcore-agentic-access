import { AGENTS, DAY_MS, TODAY_MS } from './data.js'

const DEPARTMENTS = ['Marketing', 'Sales', 'Finance', 'Engineering', 'Support', 'Operations', 'Legal', 'People']

// A small, honest parser. It turns plain words into the same filters the admin could have set by
// hand, and says so when it understood nothing. No model behind it, so it never invents a filter.
export function parseQuery(text) {
  const t = ` ${text.toLowerCase()} `
  const filters = {}
  const add = (key, value) => {
    if (!filters[key]) filters[key] = []
    if (!filters[key].includes(value)) filters[key].push(value)
  }

  DEPARTMENTS.forEach((d) => {
    if (t.includes(d.toLowerCase())) add('dept', d)
  })
  if (/not derived|unplaced|no department|unknown department/.test(t)) add('dept', 'Not derived')

  if (/no owner|without an owner|unowned|nobody owns|owner left|no accountable/.test(t)) add('owner', 'No owner')
  else if (/has an owner|owned by/.test(t)) add('owner', 'Has an owner')

  if (/high risk|\bhigh\b/.test(t)) add('risk', 'High')
  if (/medium risk|\bmedium\b/.test(t)) add('risk', 'Medium')
  if (/low risk|\blow\b/.test(t)) add('risk', 'Low')

  if (/on review|in review|under review/.test(t)) add('status', 'On review')
  else if (/\bactive\b/.test(t)) add('status', 'Active')

  if (/idle|unused|not used|dormant|never used/.test(t)) {
    add('usage', 'idle 2 mo')
    add('usage', 'idle 4 mo')
  }
  if (/\bdaily\b|every day/.test(t)) add('usage', 'daily')
  if (/\bweekly\b/.test(t)) add('usage', 'weekly')
  if (/\bmonthly\b/.test(t)) add('usage', 'monthly')

  if (/no sponsor|without a sponsor/.test(t)) add('sponsor', 'No sponsor')
  else if (/sponsor/.test(t)) add('sponsor', 'Has a sponsor')

  if (/last used today|used today/.test(t)) add('lastUsed', 'Today')
  if (/this week/.test(t)) add('lastUsed', 'This week')
  if (/older than 3 months|not used in 3 months|3 months/.test(t)) add('lastUsed', 'Older than 3 months')
  if (/created this year|new agents/.test(t)) add('created', 'This year')
  if (/older than a year/.test(t)) add('created', 'Older than a year')

  return filters
}

export const FILTER_MATCH = {
  dept: (r, v) => (v === 'Not derived' ? r.dept.kind === 'suggested' : r.dept.kind !== 'suggested' && r.dept.value === v),
  owner: (r, v) => (v === 'No owner' ? !r.owner : !!r.owner),
  risk: (r, v) => r.risk === v,
  usage: (r, v) => r.usage === v,
  status: (r, v) => r.status === v,
  sponsor: (r, v) => (v === 'No sponsor' ? !r.sponsor : !!r.sponsor),
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
    return {
      note: 'Nothing matches, and that is the point. A department is read from the human who owns the agent, so an agent with no owner cannot carry one. What exists instead is a guess from the people who call it.',
      suggestion: { ...filters, dept: ['Not derived'] },
      suggestionLabel: 'Show the unplaced ones instead',
    }
  }
  return { note: 'Nothing matches this combination. Try removing one of the filters.', suggestion: null }
}
