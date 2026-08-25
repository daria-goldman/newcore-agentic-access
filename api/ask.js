import {
  ACTION_GROUPS,
  AGENTS,
  ALL_FINDINGS,
  APP_OWNERS,
  MARKETING_IN_SCOPE,
  SCENARIOS,
  SET,
  TOTAL_AGENTS,
  UNOWNED,
  computeStats,
} from '../src/data.js'

// Everything the assistant is allowed to know, computed from the same file the screen reads, so
// the answer and the interface cannot disagree. Counts come from computeStats rather than from
// constants, which is what keeps them true after a fix has been applied.
function estate() {
  const s = computeStats(AGENTS)
  return JSON.stringify({
    estate: {
      agents: TOTAL_AGENTS,
      openViolations: s.open,
      violationsBySeverity: s.bySeverity.map((x) => ({ severity: x.label, count: x.count })),
      violationsByType: s.byType.map((x) => ({ type: x.label, count: x.count, share: x.share })),
      threats: s.threats.map((t) => ({ threat: t.label, severity: t.severity, count: t.count })),
      agentsWithoutAnOwner: { ...s.unowned, note: 'left means the owner left the company, noHr means the owner holds an account but has no HR record, never means nobody was ever named' },
      agentsOnTheWeakestPath: s.weakPath,
      marketingAgentsInScope: MARKETING_IN_SCOPE,
      marketingSetComposition: { ...SET, note: 'confirmed comes from the owner record, inferred from the owner manager, unresolved agents have no owner so their department is a guess from who calls them' },
      appOwners: APP_OWNERS,
    },
    dataModel: {
      agentFields: ['name', 'owner (a human, may be missing)', 'department (derived from the owner, never stored on the agent)', 'risk', 'usage', 'status', 'app', 'last used', 'date created'],
      ownerFieldsShownOnTheAgentRow: ['manager', 'owner title', 'owner email', 'owner type (employee, contractor, consultant)', 'owner status (active, suspended, staged, pending activation, deactivated, discovered)'],
      rules: [
        'An agent has no department field. A department is read from the human who owns it.',
        'Risk is not a score of its own. It is the severity of the worst finding open against that agent, so fixing the finding lowers the risk.',
        'Usage is the gap since the agent last called a tool, reported as used this week or idle for one week up to six months.',
        'A policy accepts several authentication paths and any one of them is enough, so an agent takes the weakest path it can present.',
        'Permissions come from an agentic profile over one app. Tools missing from a profile fall back to ask.',
        'An agent that never had an owner has no manager either, so a request about it reaches the people who call it most.',
      ],
    },
    findings: ALL_FINDINGS.map((f) => ({ id: f.id, title: f.title, where: f.where, basis: f.basis, cost: f.cost, needsOwnerApproval: f.approval, onByDefault: f.on })),
    scenarios: Object.fromEntries(
      Object.entries(SCENARIOS).map(([k, v]) => [k, { title: v.title, set: v.setTitle, note: v.setNote, blindSpot: v.blind }]),
    ),
    actions: ACTION_GROUPS,
  })
}

const SYSTEM = `You are Access AI inside a NewCore prototype, answering an IAM admin.

Answer only from the JSON below. It is the whole world you know.

Rules, in order of importance:
1. Never invent a number, a name, an agent, an app or a policy. If it is not in the JSON, you do not know it.
2. If the question cannot be answered from the JSON, say so in one sentence and name what you would need.
3. Never promise to change anything. You explain; the admin applies changes through the interface.
4. Answer in three sentences or fewer, plain English, no bullet lists, no markdown, no em dashes.
5. Refuse anything unrelated to this screen in one sentence.
6. Do not do arithmetic on the numbers. Quote them as they are given. If the admin asks for a figure that is not present, say it is not on this screen.
7. currentSession, when present, describes what the admin has already done in this conversation. Prefer it over the static numbers when they disagree, because it is more recent.

JSON:
`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(501).json({ error: 'no key configured' })

  const { question, history = [], session = null } = req.body || {}
  if (!question || typeof question !== 'string') return res.status(400).json({ error: 'question required' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        // The live state of this conversation is appended rather than baked in, so the model knows
        // which scope was chosen and what has already been applied.
        system: SYSTEM + estate() + (session ? `\n\ncurrentSession:\n${JSON.stringify(session).slice(0, 4000)}` : ''),
        messages: [
          ...history.slice(-6).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
          { role: 'user', content: question.slice(0, 600) },
        ],
      }),
    })
    if (!response.ok) return res.status(502).json({ error: 'upstream failed' })
    const data = await response.json()
    const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim()
    return res.status(200).json({ text })
  } catch (e) {
    return res.status(502).json({ error: 'request failed' })
  }
}
