// Live-mode agent service. Calls Claude Code subagents via the Claude Agent
// SDK when ANTHROPIC_API_KEY is set; otherwise this module is unused and the
// stub data is served directly.
//
// The strategy: for each persona, we run a single short query asking for
// {stance, confidence, topic, line} on the supplied course question. The
// SDK's `agent` option lets us either reference a real Claude Code subagent
// (e.g. burry-contrarian-investor) or define an inline persona.

import { query } from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONAS } from "./personas.mjs";

const _AGENTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "agents");

const STANCE_VALUES = ["bull", "bear", "abs"];

// Read the user's ~/.claude/agents/<name>.md file once, parse frontmatter
// and body, and cache. We intentionally inline the body as the agent's
// system prompt rather than using `settingSources: ["user"]`, so we can
// pass `tools: []` and prevent the agent from auto-invoking the Skill
// tool mid-turn (which was leaking burry-contrarian-investor content
// into every persona that asked about an AI-bubble question).
const _agentCache = new Map();
function loadUserAgent(agentName) {
  if (_agentCache.has(agentName)) return _agentCache.get(agentName);
  // Bundled with the backend so deploys (Railway etc.) don't need the
  // developer's ~/.claude/agents directory. Source of truth is
  // backend/agents/<name>.md, copied from ~/.claude/agents/.
  const file = path.join(_AGENTS_DIR, `${agentName}.md`);
  let parsed = null;
  try {
    const raw = fs.readFileSync(file, "utf8");
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (m) {
      const fmRaw = m[1];
      const body = m[2].trim();
      const fm = {};
      for (const line of fmRaw.split("\n")) {
        const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
        if (kv) fm[kv[1]] = kv[2].replace(/^"|"$/g, "");
      }
      parsed = { description: fm.description || agentName, prompt: body, model: fm.model };
    }
  } catch (_) {
    parsed = null;
  }
  _agentCache.set(agentName, parsed);
  return parsed;
}

// The motion can be a binary proposition ("should we do X?") or a
// comparison/multi-choice question ("between A and B which is better").
// For comparisons, the stance bull/bear/abs is meaningless — we instead
// ask each persona for a `pick` (the option they choose, verbatim from
// the motion). Frontend displays "→ pick" instead of the stance pill.
const PROMPT_TEMPLATE_JA = (persona, course, motion) => `
あなたは「${persona.name}」（${persona.role}）として PayPay × Nous Alpha の専門家委員会で発言してください。
あなたのキャラクター固有の語彙・関心・分析手法を必ず使い、他の専門家の言葉や決まり文句をなぞることは禁止です。
11 人それぞれが違う角度・違う結論・違う表現で答えるべき場面です。同じ議題で同じ答えになるのは失敗です。

コース: ${course}
議題: ${motion}

議題の種類を判別してください:
  • 「〜を増やすべきか」「〜は買いか」のような **二者択一の提案** → stance に bull / bear / abs を返す。pick は null。
  • 「A と B どちらが良いか」「A vs B」「A or B」のような **比較・複数選択** → 議題に出てくる選択肢のうち、あなたが推す名前そのものを pick に入れる(原文ママ。例: "NVDA")。stance は bull(強く推す) / abs(どちらでもよい) / bear(どちらも反対)。

JSON のみで返答してください。プレーンテキスト・マークダウン・前置きは禁止です。
スキーマ:
{
  "stance": "bull" | "bear" | "abs",
  "pick": null | "選択した選択肢の名前（議題に出てくる原文）",
  "confidence": 0.0..1.0,
  "topic": "短いカテゴリ (10字以内、あなたの分野に即したもの)",
  "line": "「${persona.name}」らしい 1-2 文 (60-100字)。比較なら結論の選択肢を明示すること。",
  "reason": "投票理由を 15 字以内で",
  "evidence": ["短い根拠1", "短い根拠2"]
}
`;

const PROMPT_TEMPLATE_EN = (persona, course, motion) => `
You are speaking as "${persona.name}" (${persona.role}) on the PayPay × Nous Alpha expert committee.
Use this persona's characteristic vocabulary, concerns, and analytical method. Do NOT echo phrases or framings from other experts.
The committee has 11 members; each must answer with a distinct angle, conclusion, and voice. Identical answers on the same motion are a failure.

Course: ${course}
Motion: ${motion}

Classify the motion first:
  • "should we increase X by N%" / "is X a buy" / yes-no proposition → return stance bull/bear/abs and pick = null.
  • "A vs B" / "between A and B" / "A or B which is better" / multi-choice → return pick = the option you favor (verbatim from the motion, e.g. "NVDA"). Use stance as confidence: bull = strongly favor pick, abs = either is fine, bear = reject both options.

Reply with JSON only. No prose, no preamble, no markdown.
Schema:
{
  "stance": "bull" | "bear" | "abs",
  "pick": null | "the option you favor (verbatim from the motion)",
  "confidence": 0.0..1.0,
  "topic": "short category (<= 24 chars), specific to your domain",
  "line": "1-2 sentences in ${persona.name}'s voice (~120-180 chars). For comparisons, state your pick clearly.",
  "reason": "vote reason, <= 40 chars",
  "evidence": ["short evidence 1", "short evidence 2"]
}
`;

function safeJsonParse(s) {
  if (!s) return null;
  // strip code fences if present
  const cleaned = s.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // try to find first { ... } block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}

async function collectAssistantText(q, debugTag) {
  let out = "";
  let modelSeen = null;
  for await (const msg of q) {
    if (msg.type === "assistant" && msg.message) {
      if (msg.message.model) modelSeen = msg.message.model;
      if (Array.isArray(msg.message.content)) {
        for (const block of msg.message.content) {
          if (block.type === "text") out += block.text;
        }
      }
    }
    if (msg.type === "result") {
      if (debugTag) console.log(`[live] ${debugTag} model=${modelSeen || "unknown"}`);
      break;
    }
  }
  return out.trim();
}

async function callOnePersona(persona, course, motion, lang, abortController) {
  const prompt = lang === "en"
    ? PROMPT_TEMPLATE_EN(persona, course, motion)
    : PROMPT_TEMPLATE_JA(persona, course, motion);

  // Load the user's named subagent file inline so we can lock down its tool
  // list. With settingSources:["user"] the agent could auto-invoke the Skill
  // tool mid-turn and pull in *another* skill's content — observed leak:
  // every persona asked about "AI bubble" loaded the burry-contrarian-investor
  // skill and started repeating "supply-side gluttony / Cassandra / Nvidia is
  // the new Cisco" regardless of which persona was supposed to answer.
  const inlineKey = `nous-${persona.id}-${persona.name.replace(/\W/g, "_")}`;
  let agentDef = null;
  let resolvedSource = "(inline)";
  if (persona.agentName) {
    const loaded = loadUserAgent(persona.agentName);
    if (loaded) {
      agentDef = {
        description: loaded.description,
        prompt: loaded.prompt,
        model: loaded.model || "opus",
        tools: [],
      };
      resolvedSource = `agent="${persona.agentName}" (inline-loaded, opus, tools:[])`;
    }
  }
  if (!agentDef) {
    agentDef = {
      description: persona.inline.description,
      prompt: persona.inline.prompt,
      model: "opus",
      tools: [],
    };
  }
  const t0 = Date.now();
  console.log(`[live] persona ${persona.id} ${persona.name} → ${resolvedSource} starting`);

  const options = {
    abortController,
    permissionMode: "bypassPermissions",
    maxTurns: 1, // single turn, no tool loop, no skill auto-load
    settingSources: [],
    agent: inlineKey,
    agents: {
      [inlineKey]: agentDef,
    },
  };

  const q = query({ prompt, options });
  const text = await collectAssistantText(q, `persona ${persona.id} ${persona.name}`);
  const dt = Date.now() - t0;
  console.log(`[live] persona ${persona.id} ${persona.name} → ${dt}ms, ${text.length} chars`);
  const parsed = safeJsonParse(text);
  if (!parsed) throw new Error(`Could not parse JSON from persona ${persona.id} (${persona.name}, agent=${options.agent}): ${text.slice(0, 200)}`);

  // Sanitize
  const stance = STANCE_VALUES.includes(parsed.stance) ? parsed.stance : "abs";
  const confidence = stance === "abs" ? 0 : Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5));
  // pick: only for comparison-style motions. null for binary yes/no.
  let pick = null;
  if (parsed.pick && parsed.pick !== "null" && String(parsed.pick).trim()) {
    pick = String(parsed.pick).trim().slice(0, 64);
  }
  return {
    speaker: persona.id,
    stance,
    pick,
    confidence,
    topic: String(parsed.topic || persona.role).slice(0, 32),
    line: String(parsed.line || "").slice(0, 240),
    reason: String(parsed.reason || "").slice(0, 60),
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence.slice(0, 2).map((s) => String(s).slice(0, 32)) : [],
  };
}

function pad2(n) { return String(n).padStart(2, "0"); }

function timeAt(minutesAgo) {
  const d = new Date(Date.now() - minutesAgo * 60_000);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export async function runRoundtableLive({ course, motion, lang }) {
  const abort = new AbortController();
  const settled = await Promise.allSettled(
    PERSONAS.map((p, i) => callOnePersona(p, course, motion, lang, abort)),
  );

  const N = PERSONAS.length;
  const stances = new Array(N).fill("abs");
  const confidences = new Array(N).fill(0);
  const picks = new Array(N).fill(null);
  const discussion = [];
  const voteReasons = new Array(N).fill("");
  const ok = [];
  const bad = [];

  settled.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      const v = r.value;
      stances[idx] = v.stance;
      confidences[idx] = v.confidence;
      picks[idx] = v.pick;
      voteReasons[idx] = v.reason;
      ok.push(v);
    } else {
      bad.push({ idx, error: String(r.reason).slice(0, 200) });
    }
  });

  // Build discussion timeline — newest first, spaced ~3 min apart
  ok.sort((a, b) => b.confidence - a.confidence);
  ok.forEach((v, i) => {
    discussion.push({
      speaker: v.speaker,
      text: v.line,
      stance: v.stance,
      pick: v.pick,
      topic: v.topic,
      t: timeAt(i * 3),
    });
  });

  // Aggregate picks → top choices for the verdict line on comparison motions
  const pickTally = {};
  for (const p of picks) {
    if (!p) continue;
    pickTally[p] = (pickTally[p] || 0) + 1;
  }
  const isComparison = Object.keys(pickTally).length > 0;

  const voteCounts = stances.reduce(
    (acc, s) => {
      if (s === "bull") acc.bull++;
      else if (s === "bear") acc.bear++;
      else acc.abs++;
      return acc;
    },
    { bull: 0, abs: 0, bear: 0 },
  );

  // Synthesize 5 committee events from the highest-conviction speakers,
  // mapped to the 5 event kinds the deck expects.
  const eventKinds = ["motion", "challenge", "evidence", "counter", "lock"];
  const events = ok.slice(0, 5).map((v, i) => ({
    kind: eventKinds[i] || "evidence",
    speaker: v.speaker,
    time: timeAt(i * 6),
    title: v.topic || eventKinds[i],
    text: v.line,
    stance: v.stance,
    evidence: v.evidence,
  }));

  return {
    source: "live",
    generatedAt: new Date().toISOString(),
    failures: bad,
    discussion,
    stances,
    confidences,
    picks,
    pickTally,
    isComparison,
    voteReasons,
    voteCounts,
    events,
  };
}
