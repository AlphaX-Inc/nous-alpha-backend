# Agents & Skills inventory

This file is the canonical inventory of every persona, agent file, and skill file used by the multi-agent backend. **It is the source of truth — if you add, remove, or rename a persona, update this file too.**

## How the three layers relate

```
PERSONAS[]               (personas.mjs)
  └─ id, name, role, agentName, inline.{description, prompt}
        │
        │  agentName  →  loadUserAgent() in agents.mjs
        ▼
agents/<name>.md         (bundled — loaded at runtime)
  └─ YAML frontmatter (description, model: opus, color)
  └─ Body → inlined as the AgentDefinition.prompt at SDK call time

skills/<name>/SKILL.md   (bundled — reference only, NOT loaded at runtime)
  └─ Full Claude Code skill file with the persona's complete methodology
  └─ Often a superset of the agent file (different framing, deeper content)
```

**Why bundle both?**

- `agents/*.md` is what the SDK actually inlines into each persona's system prompt at runtime. Loading these from the developer's `~/.claude/agents/` would break Railway deploys.
- `skills/*/SKILL.md` is the richer original from which the agent file is derived. It's bundled here for (a) traceability and (b) future use if a persona ever upgrades to loading the full skill body.

## The 11 personas

| id | Avatar | Role | Subagent name | Agent file | Skill file |
|---:|---|---|---|---|---|
| 0 | Leo Aschenbrenner | AI · Compute Scaling | `aschenbrenner-tech-hedge-fund` | [agents/aschenbrenner-tech-hedge-fund.md](agents/aschenbrenner-tech-hedge-fund.md) | [skills/aschenbrenner-tech-hedge-fund/SKILL.md](skills/aschenbrenner-tech-hedge-fund/SKILL.md) |
| 1 | Jim Simons | Quant Factor | `quantitative-finance-expert` | [agents/quantitative-finance-expert.md](agents/quantitative-finance-expert.md) | [skills/quantitative-finance-expert/SKILL.md](skills/quantitative-finance-expert/SKILL.md) |
| 2 | Ken Griffin | Multi-strategy · Citadel | `discretionary-hedge-fund-agent` | [agents/discretionary-hedge-fund-agent.md](agents/discretionary-hedge-fund-agent.md) | [skills/discretionary-hedge-fund-agent/SKILL.md](skills/discretionary-hedge-fund-agent/SKILL.md) |
| 3 | Ray Dalio | Macro · All-Weather | `dalio-macro-debt-cycle` | [agents/dalio-macro-debt-cycle.md](agents/dalio-macro-debt-cycle.md) | [skills/dalio-macro-debt-cycle/SKILL.md](skills/dalio-macro-debt-cycle/SKILL.md) |
| 4 | S. Druckenmiller | Technical · Industry Rotation | `industry-timing-rotation-model` | [agents/industry-timing-rotation-model.md](agents/industry-timing-rotation-model.md) | [skills/industry-timing-rotation-model/SKILL.md](skills/industry-timing-rotation-model/SKILL.md) |
| 5 | Howard Marks | Credit · Cycles | `soros-macro-history-debt` | [agents/soros-macro-history-debt.md](agents/soros-macro-history-debt.md) | [skills/soros-macro-history-debt/SKILL.md](skills/soros-macro-history-debt/SKILL.md) |
| 6 | Michael Burry | Contrarian | `burry-contrarian-investor` | [agents/burry-contrarian-investor.md](agents/burry-contrarian-investor.md) | [skills/burry-contrarian-investor/SKILL.md](skills/burry-contrarian-investor/SKILL.md) |
| 7 | P. Tudor Jones | Risk · Hedging | `ptj-macro-trading-playbook` | [agents/ptj-macro-trading-playbook.md](agents/ptj-macro-trading-playbook.md) | [skills/ptj-macro-trading-playbook/SKILL.md](skills/ptj-macro-trading-playbook/SKILL.md) |
| 8 | Charlie Munger | Inversion · Red-team | `munger-inversion` | [agents/munger-inversion.md](agents/munger-inversion.md) | [skills/munger-inversion/SKILL.md](skills/munger-inversion/SKILL.md) |
| 9 | Jamie Dimon | Banking · Credit | `dimon-ceo-macro-analysis` | [agents/dimon-ceo-macro-analysis.md](agents/dimon-ceo-macro-analysis.md) | [skills/dimon-ceo-macro-analysis/SKILL.md](skills/dimon-ceo-macro-analysis/SKILL.md) |
| 10 | Seth Klarman | Deep Value | `klarman-opportunistic-value` | [agents/klarman-opportunistic-value.md](agents/klarman-opportunistic-value.md) | [skills/klarman-opportunistic-value/SKILL.md](skills/klarman-opportunistic-value/SKILL.md) |

## File-size summary

The agent file is sometimes identical to the skill file (e.g. Aschenbrenner, Dimon), sometimes a leaner re-framing (e.g. Burry, Dalio, Klarman, Simons), and sometimes a fuller variant (e.g. Munger). Sizes as of last sync:

| Subagent | `agents/<name>.md` | `skills/<name>/SKILL.md` | Relationship |
|---|---:|---:|---|
| aschenbrenner-tech-hedge-fund | 49,376 | 49,364 | mirrored |
| burry-contrarian-investor | 14,892 | 52,045 | agent ⊂ skill |
| dalio-macro-debt-cycle | 17,971 | 86,915 | agent ⊂ skill |
| dimon-ceo-macro-analysis | 49,556 | 49,544 | mirrored |
| discretionary-hedge-fund-agent | 34,346 | 34,334 | mirrored |
| industry-timing-rotation-model | 21,459 | 21,447 | mirrored |
| klarman-opportunistic-value | 21,273 | 28,603 | agent ⊂ skill |
| munger-inversion | 15,198 | 11,911 | agent ⊃ skill |
| ptj-macro-trading-playbook | 41,814 | 41,802 | mirrored |
| quantitative-finance-expert | 16,970 | 43,579 | agent ⊂ skill |
| soros-macro-history-debt | 7,119 | 7,107 | mirrored |

"mirrored" means the agent file is a thin shell of frontmatter-and-comment around the same content as the skill body (the ~12-byte delta is frontmatter overhead).

## How to re-sync from your local `~/.claude` setup

If you have richer / updated versions in your Claude Code config, run from the repo root:

```bash
PERSONAS="aschenbrenner-tech-hedge-fund burry-contrarian-investor dalio-macro-debt-cycle \
dimon-ceo-macro-analysis discretionary-hedge-fund-agent industry-timing-rotation-model \
klarman-opportunistic-value munger-inversion ptj-macro-trading-playbook \
quantitative-finance-expert soros-macro-history-debt"

# Agents (what's actually loaded at runtime)
for s in $PERSONAS; do
  cp "$HOME/.claude/agents/$s.md" "agents/$s.md"
done

# Skills (reference / future use)
for s in $PERSONAS; do
  mkdir -p "skills/$s"
  cp "$HOME/.claude/skills/$s/SKILL.md" "skills/$s/SKILL.md"
done

git status agents/ skills/
```

## Adding a new persona

1. Pick a unique `agentName` matching an existing `~/.claude/agents/<name>.md`.
2. Add a `PERSONAS[]` entry in [`personas.mjs`](personas.mjs) with `id`, `name`, `role`, `role_ja`, `agentName`, and `inline.{description, prompt}` (the `inline` block is the fallback if the named agent isn't found on the host).
3. Copy `~/.claude/agents/<name>.md` into [`agents/`](agents/).
4. Copy `~/.claude/skills/<name>/SKILL.md` into [`skills/<name>/`](skills/).
5. Update the table above and the `id`-indexed `avatar` list in `frontend/paypay-roundtable.jsx`.
6. Frontend grid math: the roundtable assumes 11 avatars on the ellipse — adjust the layout constants if `PERSONAS.length` changes.

## Removing or renaming a persona

`personas.mjs` `id` values are referenced from frontend code by position (`discussion[i].speaker`). Removing a persona means re-numbering downstream ids — easier to leave a tombstone entry and drop only its `agentName` than to renumber. If you do renumber, update:
- [`personas.mjs`](personas.mjs) — `PERSONAS[]` array
- [`stub.mjs`](stub.mjs) — the canonical demo discussion still refers to speaker ids
- Frontend avatar list — speaker-id → image mapping
