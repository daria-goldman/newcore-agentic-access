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
const USAGE = ['daily', 'weekly', 'monthly', 'idle 2 mo', 'idle 4 mo']
const RISK = ['High', 'Medium', 'Low']

// The five rows drawn in the wireframe, kept verbatim so design and code agree.
const DESIGNED = [
  { name: 'meeting-prep-agent', dept: { kind: 'inferred', value: 'Marketing' }, owner: { name: 'Maya Ben-David' }, risk: 'High', usage: 'daily', status: 'Active', app: 'Salesforce' },
  { name: 'campaign-writer', dept: { kind: 'inferred', value: 'Marketing' }, owner: { name: 'Noa Katz' }, risk: 'Medium', usage: 'weekly', status: 'Active', app: 'HubSpot' },
  { name: 'promo-sync', dept: { kind: 'disputed', value: 'Marketing' }, owner: { name: 'Ronen Levy', note: 'contractor' }, risk: 'High', usage: 'daily', status: 'On review', app: 'Salesforce' },
  { name: 'content-bot', dept: { kind: 'suggested', value: 'Marketing', confidence: 90 }, owner: null, ownerNote: 'no owner', risk: 'High', usage: 'idle 4 mo', status: 'Active', app: 'Google Drive' },
  { name: 'data-sync', dept: { kind: 'suggested', value: 'Sales', confidence: 100 }, owner: null, ownerNote: 'owner left 12 Apr', risk: 'High', usage: 'weekly', status: 'Active', app: 'NetSuite' },
]

export const TOTAL_AGENTS = 612

// Composition of the derived marketing set, fixed on purpose:
// 27 confirmed through the owner's department, 4 inferred, 3 disputed = 34 in scope,
// plus 3 candidates that could not be resolved at all because nobody owns them.
export const SET = { confirmed: 27, inferred: 4, disputed: 3, unresolved: 3 }
export const MARKETING_IN_SCOPE = SET.confirmed + SET.inferred + SET.disputed // 34

// Agents with nobody accountable, split by why.
export const UNOWNED = { left: 6, noHr: 3, never: 2 }
export const UNOWNED_TOTAL = UNOWNED.left + UNOWNED.noHr + UNOWNED.never // 11

function ownerFor(i) {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`
}

function buildAgents() {
  const rows = []
  DESIGNED.forEach((d, i) => {
    rows.push({
      key: `a${i}`,
      name: d.name,
      dept: d.dept,
      owner: d.owner ? d.owner.name : null,
      ownerNote: d.owner ? d.owner.note : d.ownerNote,
      ownerGap: d.owner ? null : i === 3 ? 'never' : 'left',
      risk: d.risk,
      usage: d.usage,
      status: d.status,
      app: d.app,
      inScope: d.dept.kind !== 'suggested' && d.dept.value === 'Marketing',
      unresolved: d.dept.kind === 'suggested' && d.dept.value === 'Marketing',
    })
  })

  // Still to generate after the five designed rows.
  let confirmed = SET.confirmed
  let inferred = SET.inferred - 2
  let disputed = SET.disputed - 1
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
    } else if (disputed > 0) {
      dept = { kind: 'disputed', value: 'Marketing' }
      ownerNote = 'contractor'
      disputed--
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
    rows.push({
      key: `a${n}`,
      name,
      dept,
      owner,
      ownerNote,
      ownerGap,
      risk: roll < 0.1 ? 'High' : roll < 0.42 ? 'Medium' : 'Low',
      usage: pick(USAGE),
      status: rnd() < 0.06 ? 'On review' : 'Active',
      app: pick(APPS),
      inScope: dept.kind !== 'suggested' && dept.value === 'Marketing',
      unresolved: dept.kind === 'suggested' && dept.value === 'Marketing',
    })
    n++
  }
  return rows
}

export const AGENTS = buildAgents()
export const MARKETING_AGENTS = AGENTS.filter((a) => a.inScope)
export const UNRESOLVED_AGENTS = AGENTS.filter((a) => a.unresolved)
export const UNOWNED_AGENTS = AGENTS.filter((a) => !a.owner)

export const THREATS = [
  { severity: 'Critical', label: 'Agent used admin-level access', count: 4 },
  { severity: 'High', label: 'Agent reached an unapproved app', count: 3 },
  { severity: 'Medium', label: 'Prompt-exposed credential', count: 1 },
]

export const BY_SEVERITY = [
  { label: 'Critical', count: 3, color: '#cf1322' },
  { label: 'High', count: 9, color: '#fa8c16' },
  { label: 'Medium', count: 19, color: '#faad14' },
  { label: 'Low', count: 12, color: '#d9d9d9' },
]

export const BY_TYPE = [
  { label: 'Excessive permissions', share: 38, color: '#1677ff' },
  { label: 'No accountable owner', share: 26, color: '#69b1ff' },
  { label: 'Weak policy path', share: 19, color: '#91caff' },
  { label: 'Outside policy', share: 17, color: '#d9d9d9' },
]

export const TREND = {
  open: [21, 23, 24, 27, 29, 33, 36, 39, 41, 43],
  resolved: [12, 13, 13, 15, 16, 18, 21, 25, 29, 32],
  labels: ['19 May', '16 Jun', '14 Jul', '11 Aug'],
  delta: 22,
}

export const OPEN_FINDINGS = BY_SEVERITY.reduce((s, x) => s + x.count, 0) // 43

// What the assistant proposes on an untouched page.
export const SUGGESTIONS = [
  { id: 'harden', title: 'Harden access for marketing agents', sub: '34 agents, 8 findings across 4 apps and 2 policies' },
  { id: 'owners', title: 'Find an owner for 11 agents', sub: '6 owners left the company, 3 have no HR record' },
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
    basis: 'Their department was suggested from usage, not derived from a human, so the set cannot be trusted for them.',
    cost: 'Nothing changes until a person answers.',
    scope: 3,
    approval: true,
    on: true,
    email: true,
  },
]

export const BULK_ACTIONS = [
  { key: 'ask', label: 'Move write tools to ask' },
  { key: 'revoke', label: 'Revoke admin-level access' },
  { key: 'sessions', label: 'Revoke active sessions and tokens' },
  { key: 'owner', label: 'Request owner confirmation' },
  { key: 'suspend', label: 'Suspend' },
  { key: 'decommission', label: 'Decommission', danger: true },
]

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
    title: 'Ask the manager of each departed owner',
    where: 'Ownership',
    basis: '6 agents lost their owner when the person left. Their manager is the closest human who can name a new one.',
    cost: 'Nothing changes until a person answers.',
    scope: 6,
    approval: true,
    on: true,
    email: true,
  },
  {
    id: 'o2',
    title: 'Move write tools to ask on 4 idle agents',
    where: '3 apps',
    basis: 'No owner and no call in more than 2 months, so a wrong write would have nobody to answer for it.',
    cost: 'If one of them wakes up, its first write waits for a human. Reversible.',
    scope: 4,
    approval: false,
    on: true,
  },
  {
    id: 'o3',
    title: 'Decommission 2 agents that never had an owner',
    where: 'Salesforce, Jira',
    basis: 'Created by a person who never appeared in HR, no call in 6 months.',
    cost: 'This one is hard to undo. Credentials are revoked and the runtime is stopped.',
    scope: 2,
    approval: true,
    on: false,
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
  },
]

export const ALL_FINDINGS = [...FINDINGS, ...EXTRA_FINDINGS]

// One object per subject the assistant can be asked about.
export const SCENARIOS = {
  harden: {
    title: 'Harden access for marketing agents',
    reading: [
      'No agent carries a department, so I follow each agent to its owner.',
      `${TOTAL_AGENTS} agents checked, 37 belong to someone in Marketing.`,
      '3 of them have no owner at all, so they cannot be placed.',
    ],
    setTitle: `${MARKETING_IN_SCOPE} agents in scope`,
    setNote: 'There is no department on an agent. This set is built through the human who owns it.',
    rows: [
      ['Owner sits in Marketing', SET.confirmed, 'derived from the owner record'],
      ['Department inferred', SET.inferred, 'owner has no department, taken from their manager'],
      ['Disputed', SET.disputed, 'owner is a contractor or sits in two departments'],
    ],
    blind:
      '3 agents could not be placed. Nobody owns them, so their department is a guess from the apps they touch. They stay out of this change and become their own task.',
    findings: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'],
    scope: 'marketing',
    blindNote: '3 agents were never checked. Nobody owns them, so they were left out of this change and now sit in their own task.',
  },
  threats: {
    title: 'Threats detected in the last 5 days',
    reading: ['8 threats in 5 days, grouped by what caused them.', 'They come from 6 agents, and 4 of those sit in one team.'],
    setTitle: '8 threats from 6 agents',
    setNote: 'A threat is an event that already happened, so the question is what to change now.',
    rows: [
      ['Agent used admin-level access', 4, 'admin profile assigned through a group'],
      ['Agent reached an unapproved app', 3, 'app missing from the policy of that department'],
      ['Prompt-exposed credential', 1, 'the secret appeared in a prompt log'],
    ],
    blind: '2 of the 6 agents have no owner, so there is nobody to approve a change that breaks their work.',
    findings: ['f2', 't1', 'f7'],
    blindNote: '2 of the 6 agents have no owner, so their part of this is still open.',
  },
  severity: {
    title: '43 open violations',
    reading: ['43 open violations, ordered by what it takes to close them.', '31 of them sit on 3 policies, so three changes cover most of the list.'],
    setTitle: '43 open violations',
    setNote: 'Severity says how loud a violation is, not how hard it is to close. This set is ordered by the second one.',
    rows: [
      ['Critical', 3, 'admin access and an exposed credential'],
      ['High', 9, 'write tools nobody uses'],
      ['Medium', 19, 'access outside policy'],
      ['Low', 12, 'unused tools inside the profile'],
    ],
    blind: 'The 12 low violations are not touched here. They stay in the queue with their reason attached.',
    findings: ['f3', 'f1', 'f4'],
    blindNote: '12 low violations were left in the queue on purpose.',
  },
  type: {
    title: 'Violations by type',
    reading: ['Grouped by what is wrong, not by how loud it is.', 'Excessive permissions is the largest group at 38 percent.'],
    setTitle: '43 violations in 4 groups',
    setNote: 'Type tells you which change closes a whole group at once.',
    rows: [
      ['Excessive permissions', 16, 'tools in the profile with no call in 90 days'],
      ['No accountable owner', 11, 'nobody answers for the agent'],
      ['Weak policy path', 8, 'the agent can only take the weakest path'],
      ['Outside policy', 8, 'reached an app the policy does not list'],
    ],
    blind: 'Outside policy findings need the app owner to answer, so they cannot all be closed from this screen.',
    findings: ['f1', 'f6', 'f4'],
    blindNote: 'Outside policy findings wait on app owners and are not closed here.',
  },
  owners: {
    title: 'Find an owner for 11 agents',
    reading: ['11 agents have nobody accountable.', 'For 6 of them the owner left the company, so their manager is the closest human.'],
    setTitle: '11 agents without an owner',
    setNote: 'Ownership is the field everything else hangs on. Without it a department cannot be derived and an approval has nobody to go to.',
    rows: [
      ['Owner left the company', UNOWNED.left, 'the human record is gone, the manager remains'],
      ['Owner has no HR record', UNOWNED.noHr, 'the owner exists in the app but not in HR'],
      ['Never had an owner', UNOWNED.never, 'created without an owner and never claimed'],
    ],
    blind: '3 of these 11 are also the agents that could not be placed in any department.',
    findings: ['o1', 'o2', 'o3'],
    scope: 'unowned',
    blindNote: '3 of the 11 are still unplaced in any department until a person answers.',
  },
  path: {
    title: 'Remove the weak path from MKT-01',
    reading: ['A policy accepts several ways in and any one of them is enough.', 'An agent has no phone and no inbox, so it can only take the weakest one.'],
    setTitle: '8 policies with a weaker agent path',
    setNote: 'The policy looks strong because it lists a security key. No agent can present one.',
    rows: [
      ['Agents on MKT-01', MARKETING_IN_SCOPE, 'all of them sign in with password and OTP'],
      ['Policies with the same shape', 7, 'a strong path exists that no agent can use'],
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
