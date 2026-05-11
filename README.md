# Nous Alpha — multi-agent backend

Standalone Node/Express backend for the **Nous Alpha** AI investment-committee prototype. Powers the Roundtable and Committee screens by invoking 11 Claude Code subagents in parallel via the Claude Agent SDK and synthesizing their responses.

Frontends:
- [`AlphaX-Inc/nous-alpha-roundtable`](https://github.com/AlphaX-Inc/nous-alpha-roundtable) — single-screen Vercel deploy of the Roundtable ([live](https://nous-alpha-roundtable.vercel.app))
- [`AlphaX-Inc/paypay-nous-alpha`](https://github.com/AlphaX-Inc/paypay-nous-alpha) — full PayPay × Nous Alpha deck

Production backend: `https://nous-alpha-backend-production.up.railway.app`

---

## 1. What it does

Given a motion (yes/no proposition like *"Should PP-INC be increased by +2%?"* or a comparison like *"NVDA vs INTC"*), the backend dispatches all 11 personas in parallel against `claude-opus-4-7`, parses each persona's structured response, and returns:

- **Per-persona** `stance` (`bull`/`bear`/`abs`) + `confidence` 0..1 + `pick` (for comparison motions)
- **Discussion timeline** — each persona's quote, topic, timestamp
- **5 committee events** mapped to the deck's event kinds (motion / challenge / evidence / counter / lock)
- **Aggregates** — `pickTally` and `voteCounts` for the verdict panel

Cached per `(course, lang, motion)` for `CACHE_TTL_MS` (default 10 min), so re-renders are free within the window.

---

## 2. Architecture

```
┌────────────────────────┐         ┌──────────────────────────────────┐
│  Vercel (static HTML)  │         │  Railway (Node + Express)        │
│  nous-alpha-roundtable │         │  nous-alpha-backend              │
│                        │  HTTPS  │                                  │
│  index.html + JSX  ────┼────────►│  /api/roundtable                 │
│  window.NOUS_BACKEND_  │         │  /api/committee                  │
│    URL = railway       │         │      │                           │
└────────────────────────┘         │      ▼                           │
                                   │  Promise.allSettled([            │
                                   │    callOnePersona(0),  // Leo    │
                                   │    callOnePersona(1),  // Simons │
                                   │    ...                           │
                                   │    callOnePersona(10), // Klarman│
                                   │  ])                              │
                                   │      │                           │
                                   │      │ each spawns:              │
                                   │      ▼                           │
                                   │  ┌─────────────────────────────┐ │
                                   │  │ @anthropic-ai/              │ │
                                   │  │   claude-agent-sdk          │ │
                                   │  │   ↓ spawns                  │ │
                                   │  │ claude (Code) binary        │ │
                                   │  │   --output-format stream-   │ │
                                   │  │     json --input-format ... │ │
                                   │  │   ↓ stdin/stdout JSON-lines │ │
                                   │  │ Anthropic API → Opus 4.7    │ │
                                   │  └─────────────────────────────┘ │
                                   └──────────────────────────────────┘
```

**Important nuance: this is not the Anthropic Messages API.** Each persona is invoked by spawning the **Claude Code CLI binary** as a subprocess via the Claude Agent SDK. That gives every persona access to the full Claude Code agent runtime — system prompts, subagent loader, the same model selection logic — but with `tools: []` so no shell, file, or web tools run during a persona turn. The persona produces a single JSON response, then the subprocess exits.

11 parallel personas × 1 single-turn call each ≈ 11 spawned `claude` subprocesses per request. Locked down to a single text-generation pass, no tool loop, no skill auto-load.

---

## 3. The 11 avatars → Claude Code subagents

[`personas.mjs`](personas.mjs) maps each avatar in the deck to a named Claude Code subagent. Each subagent's full SKILL methodology lives in [`agents/<name>.md`](agents/) (frontmatter + body), bundled into this repo so the backend doesn't depend on the developer's `~/.claude/agents/` directory.

| id | Avatar | Role | Subagent (`agents/<name>.md`) |
|---:|---|---|---|
| 0 | Leo Aschenbrenner | AI · Compute Scaling | `aschenbrenner-tech-hedge-fund` |
| 1 | Jim Simons | Quant Factor | `quantitative-finance-expert` |
| 2 | Ken Griffin | Multi-strategy · Citadel | `discretionary-hedge-fund-agent` |
| 3 | Ray Dalio | Macro · All-Weather | `dalio-macro-debt-cycle` |
| 4 | S. Druckenmiller | Technical | `industry-timing-rotation-model` |
| 5 | Howard Marks | Credit | `soros-macro-history-debt` |
| 6 | Michael Burry | Contrarian | `burry-contrarian-investor` |
| 7 | P. Tudor Jones | Risk · Hedging | `ptj-macro-trading-playbook` |
| 8 | Charlie Munger | Inversion · Red-team | `munger-inversion` |
| 9 | Jamie Dimon | Banking · Credit | `dimon-ceo-macro-analysis` |
| 10 | Seth Klarman | Deep Value | `klarman-opportunistic-value` |

Each `.md` file has YAML frontmatter (`description`, `model: opus`) and a long body containing the persona's full analytical framework, decision trees, and anti-patterns. The body is passed inline as the agent's system prompt.

---

## 4. How a single persona call works

[`agents.mjs`](agents.mjs) → `callOnePersona(persona, course, motion, lang, abortController)`:

1. **Build the prompt** — `PROMPT_TEMPLATE_EN` / `PROMPT_TEMPLATE_JA` instruct the persona to (a) classify the motion (binary vs comparison) and (b) reply with strict JSON matching a fixed schema.

2. **Load the subagent body** — `loadUserAgent(persona.agentName)` reads `agents/<name>.md`, parses frontmatter + body, caches the result.

3. **Build the SDK options** — every call uses:
   ```js
   {
     abortController,
     maxTurns: 1,                       // single text-gen pass, no tool loop
     settingSources: [],                // do NOT load user settings (would pull in unrelated skills)
     agent: inlineKey,                  // tag identifying this persona's inline AgentDefinition
     agents: {
       [inlineKey]: {
         description, prompt, model: "opus", tools: [],   // no Bash/Read/Skill/etc.
       },
     },
     stderr: (chunk) => stderrChunks.push(chunk),         // capture binary stderr
     pathToClaudeCodeExecutable: CLAUDE_BINARY_PATH,      // forced glibc binary, see § 6.1
   }
   ```
   - **`tools: []` + `maxTurns: 1`** lock the agent down to a single text-generation pass — no tool use, no skill auto-load. Without this, every persona that mentions "AI bubble" pulled in the `burry-contrarian-investor` skill mid-turn and started parroting *"supply-side gluttony / Cassandra / Nvidia is the new Cisco"* regardless of which persona was supposed to answer.
   - **No `permissionMode: "bypassPermissions"`** — see § 6.3.

4. **Stream the response** — `for await (const msg of query({ prompt, options }))` collects `assistant` text blocks until a `result` message arrives, then the subprocess closes.

5. **Parse & sanitize** — `safeJsonParse` strips code fences, falls back to the first `{...}` block, validates `stance ∈ {bull, bear, abs}`, clips confidence to `[0, 1]`, trims string lengths.

6. **Return** `{ speaker, stance, pick, confidence, topic, line, reason, evidence }`.

[`runRoundtableLive`](agents.mjs) runs all 11 personas via `Promise.allSettled`, then assembles the discussion timeline (sorted by confidence), pick tally, vote counts, and 5 committee events.

---

## 5. Endpoints

```
GET /health                                         → { ok, mode, hasApiKey, deployMarker, avatarMapping }
GET /diag                                           → libc / node version / node_modules layout (debugging)
GET /diag-spawn?mode={version|help|print|sdk}       → spawn the binary directly, capture stdout/stderr
GET /api/roundtable?course=PP-INC&lang=ja&motion=…  → discussion + stances + picks
GET /api/committee?course=PP-INC&lang=ja&motion=…   → events + voteReasons + voteCounts
```

`course`, `lang`, `motion` are all optional. `lang` accepts `ja` (default) or `en`. The `/diag*` endpoints exist for production debugging — they were the way we cracked the Railway deploy issues described in § 6.

### Response shapes

```ts
// /api/roundtable
{
  source: "stub" | "live" | "stub-fallback",
  generatedAt: string,
  discussion: Array<{ speaker, text, stance, pick?, topic, t }>,   // 11 entries
  stances: Array<"bull"|"bear"|"abs">,                              // 11 entries
  confidences: number[],                                            // 11 entries, 0..1
  picks?: Array<string|null>,                                       // 11 entries on comparison motions
  pickTally?: { [option: string]: number },
  isComparison?: boolean,
  failures?: Array<{ idx, error }>,                                 // per-persona errors (debugging)
  cached?: boolean,
}

// /api/committee
{
  source, generatedAt,
  events: Array<{ kind, speaker, time, title, text, stance, evidence }>,   // 5 entries
  voteReasons: string[],                                                    // 11 short reasons
  stances, confidences,
  voteCounts: { bull, abs, bear },
  cached?: boolean,
}
```

---

## 6. Railway deployment

Production: `https://nous-alpha-backend-production.up.railway.app` (project `47da8817`, service `1b5643ff`).

### Setup steps

```bash
# 1. Install + link
brew install railway
cd nous-alpha-backend
railway login
railway link --project 47da8817-5764-4a12-8f4c-5f2ca54e1026 \
             --service 1b5643ff-eaa2-4cfd-b56d-e20ab030d6d4 \
             --environment production

# 2. Env vars (set via UI or CLI)
railway variables --set "ANTHROPIC_API_KEY=sk-ant-..."     # set in UI; never commit
railway variables --set "STUB_ONLY=false"
railway variables --set "STUB_MOTION_DELAY_MS=0"
railway variables --set "CACHE_TTL_MS=600000"
railway variables --set "ALLOWED_ORIGIN=https://nous-alpha-roundtable.vercel.app"

# 3. Deploy
railway up --ci --detach
railway domain                                              # generate public URL

# 4. Verify
curl https://nous-alpha-backend-production.up.railway.app/health | jq
```

### The three Railway gotchas

Getting `claude-agent-sdk` to actually spawn the Claude Code binary on Railway took four debug iterations. The fixes are now baked in; this section documents them so a future deploy doesn't re-discover them.

#### 6.1 — Native binary detection (musl vs glibc)

**Symptom**: `ReferenceError: Claude Code native binary not found at /app/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl/claude`.

**Root cause**: Railway's nixpacks builder installs **both** `claude-agent-sdk-linux-x64` (glibc) **and** `claude-agent-sdk-linux-x64-musl` because both are listed in `optionalDependencies` of this `package.json`. The SDK's [`F5` path picker](agents.mjs) tries the `-musl` directory **first** on Linux and returns whatever it can resolve, then fails at spawn time when the musl binary refuses to run on glibc.

**Fix** ([`agents.mjs`](agents.mjs)): set `pathToClaudeCodeExecutable` explicitly to the glibc binary, bypassing the path picker entirely:

```js
function resolveClaudePath() {
  if (process.platform !== "linux" || process.arch !== "x64") return undefined;
  const glibc = path.join(process.cwd(), "node_modules", "@anthropic-ai",
                          "claude-agent-sdk-linux-x64", "claude");
  if (fs.existsSync(glibc)) return glibc;
  return undefined;
}
const CLAUDE_BINARY_PATH = resolveClaudePath();
// then:
options.pathToClaudeCodeExecutable = CLAUDE_BINARY_PATH;
```

#### 6.2 — Silent stderr

**Symptom**: After fix 6.1, every persona failed with `Error: Claude Code process exited with code 1` and no other information. Direct invocation of the binary worked perfectly.

**Root cause**: The SDK silently discards stderr from the spawned binary unless `DEBUG_CLAUDE_AGENT_SDK` is set or `options.stderr` is passed. We were getting zero signal about why the binary was exiting.

**Fix** ([`agents.mjs`](agents.mjs)): always pass an `options.stderr` callback:

```js
const stderrChunks = [];
options.stderr = (chunk) => { if (stderrChunks.length < 50) stderrChunks.push(String(chunk).slice(0, 800)); };
// then on error:
throw new Error(`${String(err).slice(0, 200)} | stderr: ${stderrChunks.join("").slice(0, 1500)}`);
```

#### 6.3 — `--dangerously-skip-permissions` under root

**Symptom** (visible only after 6.2): `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons`.

**Root cause**: Railway containers run as **root** by default. Setting `permissionMode: "bypassPermissions"` in SDK options translates to `--dangerously-skip-permissions` on the binary's command line, and the binary refuses to start under root.

**Fix** ([`agents.mjs`](agents.mjs)): **drop `permissionMode` entirely**. With `tools: []` there are no tool-permission prompts to bypass anyway.

```js
const options = {
  abortController,
  // NO permissionMode: "bypassPermissions" — Railway runs as root, binary rejects.
  // With tools:[] there are no permission prompts to bypass.
  maxTurns: 1,
  settingSources: [],
  agent: inlineKey,
  agents: { [inlineKey]: agentDef },
  stderr: (chunk) => stderrChunks.push(chunk),
  pathToClaudeCodeExecutable: CLAUDE_BINARY_PATH,
};
```

### Builder choice — nixpacks vs Dockerfile

We tried switching to a `Dockerfile` (`node:20-slim`) to get more control over the install process, but Railway's existing service setting (nixpacks) takes precedence over `railway.json` once initialized. Fix 6.1 (`pathToClaudeCodeExecutable`) was the cleaner workaround — it doesn't fight Railway's builder, and works whether nixpacks or Docker is used.

The `Dockerfile` and `railway.json` files remain in the repo for the case where a fresh service is created from scratch (where Railway auto-detects the Dockerfile).

---

## 7. Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Listen port (Railway injects this automatically) |
| `ANTHROPIC_API_KEY` | unset → stub | Switches to live mode when present |
| `STUB_ONLY` | `false` | Force stub mode even if API key is set |
| `STUB_MOTION_DELAY_MS` | `1500` | Artificial delay in stub mode so deliberation "feels real" |
| `CACHE_TTL_MS` | `600000` | 10 minutes |
| `ALLOWED_ORIGIN` | unset → reflect | CORS allow-list, e.g. `https://nous-alpha-roundtable.vercel.app` |
| `DEBUG_CLAUDE_AGENT_SDK` | unset | Set to `1` to log the SDK's spawn command + binary stderr |

---

## 8. Modes

### Stub (no API key)

```bash
npm install
npm start                      # → http://localhost:3001
```

Hardcoded but realistic data matching the frontend's exact shapes. Use for frontend dev and design demos.

### Live (`ANTHROPIC_API_KEY` set)

Each persona is invoked via the Claude Agent SDK with `agent: <inline-key>` and the bundled `agents/<name>.md` body inlined as the agent's prompt. All 11 calls run in parallel; results cached per `(course, lang, motion)` for `CACHE_TTL_MS`. If a live run fails, the endpoint silently falls back to stub data with `source: "stub-fallback"` so the screen never shows a hard error.

```bash
cp .env.example .env           # then set ANTHROPIC_API_KEY=sk-...
npm start
```

---

## 9. Wiring the frontend

```js
// roundtable index.html / paypay-roundtable.jsx
window.NOUS_BACKEND_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001'
  : 'https://nous-alpha-backend-production.up.railway.app';
```

Frontend hydration via `useNousData` reads `window.NOUS_BACKEND_URL` and fires `GET /api/roundtable?lang=…&motion=…` on mount and on every motion submit.

---

## 10. Cost

A live run = **11 parallel Opus calls** ≈ **$0.50–$1.50** per unique `(course, lang, motion)`. The 10-min cache means same-question repeats are free within the window.

Set a per-day spend cap on the Anthropic key for production deploys. Also worth considering before opening the URL publicly:

1. **Rate-limit** `/api/roundtable` per-IP (`express-rate-limit`, ~3 req/min).
2. **Gate** with a query-string token (`?key=…`) embedded in the frontend URL.
3. **Cap** the per-day Anthropic spend on the key.

---

## 11. Local development

```bash
git clone https://github.com/AlphaX-Inc/nous-alpha-backend
cd nous-alpha-backend
npm install
cp .env.example .env             # set ANTHROPIC_API_KEY if you want live mode
npm run dev                      # node --watch server.mjs
```

Sanity check:
```bash
curl 'http://localhost:3001/api/roundtable?lang=en&motion=NVDA+vs+INTC' | jq '.discussion[0]'
```

---

## 12. Troubleshooting recipes

| Symptom | First check |
|---|---|
| `/health` returns `mode: stub` despite key being set | `STUB_ONLY` set to `true`? Wrong env var name? |
| `/api/roundtable` returns 0 discussion + 11 failures | Curl `/diag-spawn?mode=sdk` — does the binary run at all? |
| Failures say `binary not found at .../linux-x64-musl/claude` | Fix 6.1 not applied — check `pathToClaudeCodeExecutable` in [`agents.mjs`](agents.mjs) |
| Failures say `process exited with code 1` with no stderr | Fix 6.2 not applied — add `options.stderr` callback |
| Failures say `--dangerously-skip-permissions cannot be used with root` | Fix 6.3 not applied — drop `permissionMode: "bypassPermissions"` |
| All personas return the same text | `settingSources: []` missing or `tools: []` missing — skill auto-load is leaking content across personas |
| CORS errors in browser | `ALLOWED_ORIGIN` doesn't match Vercel URL exactly (trailing slash, http vs https) |
