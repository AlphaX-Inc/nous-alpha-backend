// PayPay × Nous Alpha — multi-agent backend
// Two endpoints powering screens 4 (Roundtable) and 5 (Committee):
//   GET /api/roundtable?course=PP-INC&lang=ja
//   GET /api/committee?course=PP-INC&lang=ja
//
// Modes:
//   - Stub  (default): hardcoded realistic data, no API key needed.
//   - Live  (set ANTHROPIC_API_KEY): runs 12 personas in parallel via
//     Claude Agent SDK, caches result per (course, lang, motion) for
//     CACHE_TTL_MS so re-renders don't re-pay.

import dotenv from "dotenv";
// override:true so a pre-existing empty ANTHROPIC_API_KEY in the parent
// shell (Claude Code sets one) doesn't shadow the value from .env.
dotenv.config({ override: true });
import express from "express";
import cors from "cors";
import { buildRoundtablePayload, buildCommitteePayload } from "./stub.mjs";
import { PERSONA_MAPPING } from "./personas.mjs";

const PORT = Number(process.env.PORT || 3001);
const STUB_ONLY = process.env.STUB_ONLY === "true";
const HAS_API_KEY = !!process.env.ANTHROPIC_API_KEY;
const LIVE_MODE = !STUB_ONLY && HAS_API_KEY;
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 10 * 60 * 1000); // 10 min
// Make a user-submitted motion *feel* like 12 agents deliberating, even in
// stub mode. Override with STUB_MOTION_DELAY_MS=0 to disable.
const STUB_MOTION_DELAY_MS = Number(process.env.STUB_MOTION_DELAY_MS ?? 1500);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_MOTION_JA = "PP-INC を +2% に増やすべきか";
const DEFAULT_MOTION_EN = "Should PP-INC be increased by +2%?";

const app = express();
// Allow specific origin in production (e.g. https://paypay-nous-alpha.vercel.app);
// reflect any origin during local dev when ALLOWED_ORIGIN is unset.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
app.use(cors({ origin: ALLOWED_ORIGIN || true }));
app.use(express.json());

// In-memory cache: key → { expiresAt, payload }
const cache = new Map();
function cacheGet(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() > v.expiresAt) { cache.delete(key); return null; }
  return v.payload;
}
function cacheSet(key, payload) {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
}

let runRoundtableLive = null;
async function ensureLiveLoaded() {
  if (!LIVE_MODE) return null;
  if (!runRoundtableLive) {
    const mod = await import("./agents.mjs");
    runRoundtableLive = mod.runRoundtableLive;
  }
  return runRoundtableLive;
}

// ─── Endpoints ──────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mode: LIVE_MODE ? "live" : "stub",
    hasApiKey: HAS_API_KEY,
    stubOnly: STUB_ONLY,
    cacheSize: cache.size,
    avatarMapping: PERSONA_MAPPING,
    deployMarker: "v5-no-bypass-perms", // bump on each redeploy attempt to verify rollout
  });
});

app.get("/diag-spawn", async (req, res) => {
  const { spawn } = await import("node:child_process");
  const path = await import("node:path");
  const bin = path.resolve("node_modules", "@anthropic-ai", "claude-agent-sdk-linux-x64", "claude");
  const mode = req.query.mode || "version";
  let args;
  if (mode === "version") args = ["--version"];
  else if (mode === "help") args = ["--help"];
  else if (mode === "sdk") args = ["--output-format", "stream-json", "--verbose", "--input-format", "stream-json"];
  else if (mode === "print") args = ["-p", "say hello in one word"];
  else args = ["--version"];

  const child = spawn(bin, args, {
    env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: "sdk-ts" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", (d) => { stdout += d.toString(); });
  child.stderr.on("data", (d) => { stderr += d.toString(); });

  // For sdk mode, send a minimal initialize message and close stdin
  if (mode === "sdk") {
    child.stdin.write(JSON.stringify({ type: "user", message: { role: "user", content: "hi" } }) + "\n");
    setTimeout(() => { try { child.stdin.end(); } catch {} }, 1000);
  } else {
    child.stdin.end();
  }

  const result = await new Promise((r) => {
    let exitCode = null, signal = null;
    child.on("exit", (code, sig) => { exitCode = code; signal = sig; r({ exitCode, signal }); });
    child.on("error", (e) => { stderr += "spawn error: " + String(e); r({ exitCode: -1, signal: null }); });
    setTimeout(() => { try { child.kill(); } catch {}; r({ exitCode: -2, signal: "TIMEOUT" }); }, 8000);
  });
  res.json({ bin, args, ...result, stdout: stdout.slice(0, 4000), stderr: stderr.slice(0, 4000) });
});

app.get("/diag", async (_req, res) => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.resolve("node_modules", "@anthropic-ai");
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch (e) {
    return res.json({ error: String(e) });
  }
  const detail = await Promise.all(entries.map(async (name) => {
    const p = path.join(dir, name);
    let claudeExists = false;
    let stat = null;
    try {
      stat = await fs.stat(path.join(p, "claude"));
      claudeExists = true;
    } catch {}
    return { name, claudeExists, claudeSize: stat?.size ?? null };
  }));
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    libc: process.report?.getReport?.()?.header?.glibcVersionRuntime ?? "n/a",
    cwd: process.cwd(),
    anthropicDirs: detail,
  });
});

app.get("/api/roundtable", async (req, res) => {
  const lang = req.query.lang === "en" ? "en" : "ja";
  const course = String(req.query.course || "PP-INC");
  const motion = String(req.query.motion || (lang === "en" ? DEFAULT_MOTION_EN : DEFAULT_MOTION_JA));

  if (!LIVE_MODE) {
    if (req.query.motion && STUB_MOTION_DELAY_MS > 0) await sleep(STUB_MOTION_DELAY_MS);
    return res.json(buildRoundtablePayload(lang));
  }

  const key = `roundtable|${course}|${lang}|${motion}`;
  const cached = cacheGet(key);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const run = await ensureLiveLoaded();
    const live = await run({ course, motion, lang });
    const payload = {
      source: live.source,
      generatedAt: live.generatedAt,
      discussion: live.discussion,
      stances: live.stances,
      confidences: live.confidences,
      picks: live.picks,
      pickTally: live.pickTally,
      isComparison: live.isComparison,
      failures: live.failures, // expose per-persona errors so deploy issues are debuggable from curl
    };
    cacheSet(key, payload);
    res.json(payload);
  } catch (err) {
    console.error("[roundtable] live failed, falling back to stub:", err);
    res.json({ ...buildRoundtablePayload(lang), source: "stub-fallback", error: String(err).slice(0, 200) });
  }
});

app.get("/api/committee", async (req, res) => {
  const lang = req.query.lang === "en" ? "en" : "ja";
  const course = String(req.query.course || "PP-INC");
  const motion = String(req.query.motion || (lang === "en" ? DEFAULT_MOTION_EN : DEFAULT_MOTION_JA));

  if (!LIVE_MODE) {
    if (req.query.motion && STUB_MOTION_DELAY_MS > 0) await sleep(STUB_MOTION_DELAY_MS);
    return res.json(buildCommitteePayload(lang));
  }

  // Reuse the same live run as roundtable — output covers both shapes
  const key = `live|${course}|${lang}|${motion}`;
  const cached = cacheGet(key);
  if (cached) {
    return res.json({
      source: cached.source,
      generatedAt: cached.generatedAt,
      events: cached.events,
      voteReasons: cached.voteReasons,
      stances: cached.stances,
      confidences: cached.confidences,
      voteCounts: cached.voteCounts,
      cached: true,
    });
  }

  try {
    const run = await ensureLiveLoaded();
    const live = await run({ course, motion, lang });
    cacheSet(key, live);
    res.json({
      source: live.source,
      generatedAt: live.generatedAt,
      events: live.events,
      voteReasons: live.voteReasons,
      stances: live.stances,
      confidences: live.confidences,
      voteCounts: live.voteCounts,
    });
  } catch (err) {
    console.error("[committee] live failed, falling back to stub:", err);
    res.json({ ...buildCommitteePayload(lang), source: "stub-fallback", error: String(err).slice(0, 200) });
  }
});

app.listen(PORT, () => {
  console.log(`PayPay × Nous Alpha backend listening on :${PORT}`);
  console.log(`  mode: ${LIVE_MODE ? "LIVE (Claude Agent SDK)" : "STUB"}`);
  console.log(`  endpoints:`);
  console.log(`    GET  http://localhost:${PORT}/health`);
  console.log(`    GET  http://localhost:${PORT}/api/roundtable?course=PP-INC&lang=ja`);
  console.log(`    GET  http://localhost:${PORT}/api/committee?course=PP-INC&lang=ja`);
});
