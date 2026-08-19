# NewCore · Agentic Access

Prototype of the agentic experience for the IAM admin, built around one request:

> I want to harden the access of my marketing agents.

Live: **https://newcore-agentic-access.vercel.app/**

## What this screen argues

An agent record has no department. It has an owner, and the owner is a human who has one. So a set called
"marketing agents" cannot be read from a field, it has to be derived through people, and the derivation is
never clean. The assistant therefore does not answer with a message. It answers with an object that carries:

- **a subject**: 34 agents, split into how each one got there (owner in Marketing, inferred, disputed)
- **contents**: 8 findings, each with what it is based on and what it costs
- **a boundary**: 3 agents nobody owns, which stay out of the change and become their own task
- **a next step**: changes the admin selects and applies, with per item status and undo

The final screen is not allowed to say "done". It states what was applied, what waits on a person and what
was never checked.

## Try it

1. Click **Harden access for marketing agents** in the right panel
2. Watch the set being derived through owners, not from a field
3. Open the findings, switch any of them off, apply the rest
4. Read the result, including the part that failed and the part nobody could check

Also live on the screen: row selection with bulk actions, an owner request modal, search, risk filter and the
collapsible assistant.

## Run locally

```bash
npm install
npm run dev
```

## Access and configuration

The deployment is behind basic auth. `middleware.js` asks for a password taken from the
`SITE_PASSWORD` environment variable on Vercel. With no variable set the site stays open, so a
missing setting never breaks a review.

`api/ask.js` answers typed questions with Claude, constrained to the estate in `src/data.js`:
it is told to invent nothing, to say when it does not know, and to never promise a change.
It runs only when `ANTHROPIC_API_KEY` is set. Without a key the panel falls back to the rules in
`src/query.js`, so the prototype works offline and a demo never depends on the network.

| Variable | What it does |
|---|---|
| `SITE_PASSWORD` | Password for the whole site, any username works |
| `ANTHROPIC_API_KEY` | Enables the live answers, optional |

## Stack

React 19, Vite, Ant Design 6. The wireframes and the UI were drawn in Figma on the same Ant Design library,
so the component set in the code and in the design file is the same one.

Every number on the screen comes from `src/data.js`, which generates a deterministic estate of 612 agents.
The widgets, the table and the assistant all read from it, so the counts cannot drift apart.
