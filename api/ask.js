import {
  ACTION_GROUPS,
  ALL_FINDINGS,
  BY_SEVERITY,
  BY_TYPE,
  MARKETING_IN_SCOPE,
  OPEN_FINDINGS,
  SCENARIOS,
  SET,
  THREATS,
  TOTAL_AGENTS,
  UNOWNED,
} from '../src/data.js'

// Everything the assistant is allowed to know. It is built from the same file the screen reads,
// so the answer and the interface can never disagree.
function estate() {
  return JSON.stringify(
    {
      estate: {
        agents: TOTAL_AGENTS,
        openFindings: OPEN_FINDINGS,
        marketingAgentsInScope: MARKETING_IN_SCOPE,
        marketingSetComposition: SET,
        agentsWithoutAnOwner: UNOWNED,
        threats: THREATS,
        violationsBySeverity: BY_SEVERITY,
        violationsByType: BY_TYPE,
      },
      dataModel: {
        agentFields: ['name', 'owner (a human)', 'department (derived from the owner, never stored on the agent)', 'risk', 'usage', 'status', 'sponsor', 'last used', 'date created'],
        rules: [
          'An agent has no department field. A department is read from the human who owns it.',
          'A policy accepts several authentication paths and any one of them is enough, so an agent takes the weakest path it can present.',
          'Permissions come from an agentic profile over one app. Tools missing from a profile fall back to ask.',
        ],
      },
      findings: ALL_FINDINGS.map((f) => ({ id: f.id, title: f.title, where: f.where, basis: f.basis, cost: f.cost, needsOwnerApproval: f.approval, onByDefault: f.on })),
      scenarios: Object.fromEntries(
        Object.entries(SCENARIOS).map(([k, v]) => [k, { title: v.title, set: v.setTitle, note: v.setNote, blindSpot: v.blind }]),
      ),
      actions: ACTION_GROUPS,
    },
    null,
    0,
  )
}

const SYSTEM = `You are Access AI inside a NewCore prototype, answering an IAM admin.

Answer only from the JSON below. It is the whole world you know.

Rules, in order of importance:
1. Never invent a number, a name, an agent, an app or a policy. If it is not in the JSON, you do not know it.
2. If the question cannot be answered from the JSON, say so in one sentence and name what you would need.
3. Never promise to change anything. You explain; the admin applies changes through the interface.
4. Answer in three sentences or fewer, plain English, no bullet lists, no markdown, no em dashes.
5. Refuse anything unrelated to this screen in one sentence.

JSON:
`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(501).json({ error: 'no key configured' })

  const { question, history = [] } = req.body || {}
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
        system: SYSTEM + estate(),
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
