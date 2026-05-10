# Nous Alpha — multi-agent backend

Standalone Node/Express backend for the **Nous Alpha** AI investment-committee prototype. Powers the Roundtable and Committee screens by invoking 11 Claude Code subagents in parallel via the Claude Agent SDK and synthesizing their responses.

Frontends:
- [`AlphaX-Inc/nous-alpha-roundtable`](https://github.com/AlphaX-Inc/nous-alpha-roundtable) — single-screen Vercel deploy of the Roundtable
- [`AlphaX-Inc/paypay-nous-alpha`](https://github.com/AlphaX-Inc/paypay-nous-alpha) — full PayPay × Nous Alpha deck

## What it does

11 named expert personas (Aschenbrenner, Simons, Griffin, Dalio, Druckenmiller, Marks, Burry, Tudor Jones, Munger, Dimon, Klarman) each map to a Claude Code subagent. Given a motion (a yes/no proposition or a comparison like "NVDA vs INTC"), the backend dispatches all 11 personas in parallel against `claude-opus-4-7` and returns:

- Per-persona `stance` (`bull` / `bear` / `abs`) + `confidence` 0..1
- A `pick` per persona for comparison motions ("NVDA" / "INTC")
- A discussion timeline (each persona's quote, topic, timestamp)
- 5 committee events (motion / challenge / evidence / counter / lock)
- Aggregated `pickTally` and `voteCounts` for the verdict panel

## Endpoints

```
GET /health
GET /api/roundtable?course=PP-INC&lang=ja&motion=...
GET /api/committee?course=PP-INC&lang=ja&motion=...
```

`course`, `lang`, `motion` are optional. `lang` accepts `ja` (default) or `en`.

## Modes

### Stub (default — no API key needed)

Hardcoded but realistic data matching the frontend's exact shapes. Use for frontend dev and design demos.

```bash
npm install
npm start
# → http://localhost:3001
```

### Live (set `ANTHROPIC_API_KEY`)

Each persona is invoked via the Claude Agent SDK with `agent: <name>` referencing the bundled `agents/<name>.md` files (each pinned to `model: opus`). All 11 calls run in parallel; results cached per `(course, lang, motion)` for `CACHE_TTL_MS` (default 10 min).

```bash
cp .env.example .env
# edit .env, set ANTHROPIC_API_KEY=sk-...
npm start
```

If a live run fails for any persona, the endpoint silently falls back to stub data with `source: "stub-fallback"` so the screen never shows a hard error.

## How the agent system works

Each persona in `personas.mjs` is paired with an `agentName` (e.g. `burry-contrarian-investor`). The backend reads the corresponding `agents/<name>.md` file (frontmatter + body), passes the body inline as a system prompt, and invokes the SDK with:

```js
options = {
  agent: inlineKey,
  agents: { [inlineKey]: { description, prompt, model: 'opus', tools: [] } },
  maxTurns: 1,
  settingSources: [],
}
```

`tools: []` and `maxTurns: 1` lock the agent down to a single text-generation pass — no tool use, no skill auto-loading, so each persona stays in its own analytical voice.

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Listen port (Railway auto-injects this) |
| `ANTHROPIC_API_KEY` | unset → stub mode | Switches to live mode when present |
| `STUB_ONLY` | `false` | Force stub mode even if API key is set |
| `STUB_MOTION_DELAY_MS` | `1500` | Artificial delay in stub mode so the "deliberation" feels real |
| `CACHE_TTL_MS` | `600000` | 10 minutes |
| `ALLOWED_ORIGIN` | unset → reflect | CORS allow-list, e.g. `https://nous-alpha-roundtable.vercel.app` |

## Deploy on Railway

1. **railway.com → New Project → Deploy from GitHub repo** → `AlphaX-Inc/nous-alpha-backend`
2. **Variables**:
   - `ANTHROPIC_API_KEY` = (from console.anthropic.com)
   - `ALLOWED_ORIGIN` = your Vercel frontend URL
3. **Settings → Networking → Generate Domain** → copy the URL
4. Wire the frontend by setting `window.NOUS_BACKEND_URL` to the Railway domain.

```bash
curl https://<your>.up.railway.app/health
# → {"ok":true,"mode":"live","hasApiKey":true,...}
```

## Data shapes

### `/api/roundtable` response

```ts
{
  source: "stub" | "live" | "stub-fallback",
  generatedAt: string,
  discussion: Array<{
    speaker: number,            // persona id 0..10
    text: string,
    stance: "bull"|"bear"|"abs",
    pick?: string | null,       // present on comparison motions
    topic: string,
    t: "HH:MM",
  }>,
  stances: Array<"bull"|"bear"|"abs">,   // 11 entries
  confidences: Array<number>,             // 11 entries, 0..1
  picks?: Array<string|null>,             // 11 entries on comparison motions
  pickTally?: { [option: string]: number },
  isComparison?: boolean,
  cached?: boolean,
  error?: string,
}
```

### `/api/committee` response

```ts
{
  source: "stub" | "live" | "stub-fallback",
  generatedAt: string,
  events: Array<{
    kind: "motion"|"challenge"|"evidence"|"counter"|"lock",
    speaker: number, time: "HH:MM", title: string, text: string,
    stance: "bull"|"bear"|"abs",
    evidence: string[],
  }>,
  voteReasons: string[],                  // 11 short reasons
  stances: Array<"bull"|"bear"|"abs">,
  confidences: Array<number>,
  voteCounts: { bull: number, abs: number, bear: number },
  cached?: boolean,
  error?: string,
}
```

## Cost note

A live run = 11 parallel Opus calls ≈ $0.50–1.50 per unique `(course, lang, motion)`. The 10-min cache means same-question repeats are free within the window. Set a per-day spend cap on the Anthropic key for production deploys.
