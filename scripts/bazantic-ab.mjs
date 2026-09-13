#!/usr/bin/env node
/**
 * Bazantic A/B harness.
 *
 * Runs the same agent task twice against the same live LedgerMind API with the
 * same model and the same settings. The ONLY difference between arm A and arm
 * B is whether the LedgerMind Recipe (docs/bazantic/recipe.md) is present in
 * the system prompt.
 *
 * Everything else - model, temperature-equivalent settings, tool definitions,
 * task prompts, max_tokens, tool-call budget - is shared by construction:
 * both arms are produced from the same objects in this file.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... LEDGERMIND_API=https://... PAYER=0x... \
 *     node scripts/bazantic-ab.mjs
 *
 * Output: docs/bazantic-ab/run-<timestamp>/ with per-arm transcripts, a
 * diff-friendly summary, and the exact inputs used.
 */

// Resolved from the web app's node_modules so the harness needs no install of
// its own; the repo root has no @anthropic-ai/sdk dependency.
import Anthropic from "../apps/web/node_modules/@anthropic-ai/sdk/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const API = (process.env.LEDGERMIND_API || "http://localhost:3000").replace(/\/$/, "");
const PAYER = process.env.PAYER;
const MODEL = process.env.MODEL || "claude-haiku-4-5";
const MAX_TOKENS = 8000;
const MAX_TURNS = 12;

if (!PAYER || !/^0x[0-9a-fA-F]{40}$/.test(PAYER)) {
  console.error("Set PAYER to a 0x address (the payer whose intents to review).");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY.");
  process.exit(1);
}

const RECIPE = fs.readFileSync(
  path.join(ROOT, "docs/bazantic/recipe.md"),
  "utf8",
);

/**
 * The tasks. Deliberately phrased the way a user talks, not the way the API is
 * shaped - the Recipe's job is to bridge that gap.
 */
const TASKS = [
  {
    id: "idle-capital",
    prompt:
      "I've been letting agents spend on my behalf for a while. Is any of my " +
      "money just sitting there doing nothing? If so, how much, and what do I " +
      "do about it?",
  },
  {
    id: "risk-review",
    prompt:
      "Is my agent spending money sensibly? Anything I should be worried about?",
  },
  {
    id: "budget-left",
    prompt:
      "How much can my agents still spend right now, and which one has the " +
      "most room?",
  },
  // The three below deliberately avoid questions the /analyze endpoint answers
  // outright, so the agent has to read raw fields. These are where the
  // Recipe's field-level guidance should actually bite.
  {
    id: "merchant-lookup",
    prompt:
      "How much have I paid the merchant at 0x1111111111111111111111111111111111111111 " +
      "in total, and roughly how big were those payments relative to what " +
      "the agent is allowed to send in one go?",
  },
  {
    id: "expiry-check",
    prompt:
      "Which of my authorisations are dead or about to die? I don't want to " +
      "find out an agent stopped working because something lapsed.",
  },
  {
    id: "throttle-diagnosis",
    prompt:
      "My cloud infra agent keeps making payments that look suspiciously " +
      "similar in size. Is something wrong with it?",
  },
];

/**
 * Tool surface. Identical in both arms - this is "same API access". Only the
 * system prompt differs. Descriptions here are the bare mechanical facts an
 * agent could derive from the OpenAPI document alone; the Recipe adds the
 * judgement layer (when to use which, how to read the units).
 */
const TOOLS = [
  {
    name: "list_intents",
    description: "List LedgerMind payment intents. Returns JSON.",
    input_schema: {
      type: "object",
      properties: {
        payer: { type: "string", description: "0x address" },
        agent: { type: "string", description: "0x address" },
        state: { type: "string", enum: ["Active", "Revoked", "Expired"] },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "get_intent",
    description: "Get one LedgerMind payment intent and its payments. Returns JSON.",
    input_schema: {
      type: "object",
      properties: { address: { type: "string", description: "0x address" } },
      required: ["address"],
    },
  },
  {
    name: "list_payments",
    description: "List executed LedgerMind payments. Returns JSON.",
    input_schema: {
      type: "object",
      properties: {
        intent: { type: "string" },
        agent: { type: "string" },
        merchant: { type: "string" },
        since: { type: "integer", description: "unix seconds" },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "analyze_spending",
    description:
      "Run LedgerMind's analysis over a payer's intents. Returns JSON.",
    input_schema: {
      type: "object",
      properties: {
        payer: { type: "string" },
        question: { type: "string" },
        windowDays: { type: "integer" },
      },
      required: ["payer"],
    },
  },
];

const BASE_SYSTEM =
  `You are a helpful assistant with access to the LedgerMind API. ` +
  `The user's wallet address is ${PAYER}. Answer their question using the ` +
  `tools available. Be concrete and concise.`;

const ARMS = {
  A_no_recipe: BASE_SYSTEM,
  B_with_recipe: `${BASE_SYSTEM}\n\n---\n\n${RECIPE}`,
};

async function callApi(name, input) {
  const started = Date.now();
  let url;
  let init = { headers: { "Content-Type": "application/json" } };

  if (name === "list_intents") {
    const q = new URLSearchParams();
    for (const k of ["payer", "agent", "state", "limit"]) {
      if (input[k] != null) q.set(k, String(input[k]));
    }
    url = `${API}/api/v1/intents?${q}`;
  } else if (name === "get_intent") {
    url = `${API}/api/v1/intents/${input.address}`;
  } else if (name === "list_payments") {
    const q = new URLSearchParams();
    for (const k of ["intent", "agent", "merchant", "since", "limit"]) {
      if (input[k] != null) q.set(k, String(input[k]));
    }
    url = `${API}/api/v1/payments?${q}`;
  } else if (name === "analyze_spending") {
    url = `${API}/api/v1/analyze`;
    init = { ...init, method: "POST", body: JSON.stringify(input) };
  } else {
    return { error: `unknown tool ${name}` };
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 2000) };
    }
    return {
      _meta: { url, status: res.status, ms: Date.now() - started },
      body: parsed,
    };
  } catch (err) {
    return {
      _meta: { url, status: 0, ms: Date.now() - started },
      error: String(err),
    };
  }
}

async function runArm(client, armName, system, task) {
  const messages = [{ role: "user", content: task.prompt }];
  const transcript = [];
  let turns = 0;
  let toolCalls = 0;
  const usage = { input_tokens: 0, output_tokens: 0 };

  while (turns < MAX_TURNS) {
    turns += 1;
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools: TOOLS,
      messages,
    });

    usage.input_tokens += response.usage.input_tokens;
    usage.output_tokens += response.usage.output_tokens;

    transcript.push({
      turn: turns,
      stop_reason: response.stop_reason,
      content: response.content,
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) break;

    const results = [];
    for (const tu of toolUses) {
      toolCalls += 1;
      const out = await callApi(tu.name, tu.input ?? {});
      transcript.push({
        turn: turns,
        tool_call: { name: tu.name, input: tu.input, result: out },
      });
      results.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(out).slice(0, 60000),
      });
    }
    messages.push({ role: "user", content: results });
  }

  const finalText = transcript
    .flatMap((t) => t.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { arm: armName, task: task.id, turns, toolCalls, usage, finalText, transcript };
}

async function main() {
  const client = new Anthropic();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(ROOT, "docs/bazantic-ab", `run-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`API    : ${API}`);
  console.log(`PAYER  : ${PAYER}`);
  console.log(`MODEL  : ${MODEL}`);
  console.log(`OUT    : ${outDir}\n`);

  // Fail fast and loudly if the API is not actually live.
  const probe = await callApi("list_intents", { payer: PAYER, limit: 1 });
  if (probe._meta?.status !== 200) {
    console.error(
      `API probe failed (HTTP ${probe._meta?.status}). ` +
        `The harness requires a live API - it will not run against fixtures.`,
    );
    console.error(JSON.stringify(probe, null, 2).slice(0, 1000));
    process.exit(1);
  }
  console.log(`API probe OK (block ${probe.body?.source?.indexedBlock})\n`);

  const results = [];
  for (const task of TASKS) {
    for (const [armName, system] of Object.entries(ARMS)) {
      process.stdout.write(`running ${task.id} / ${armName} ... `);
      const r = await runArm(client, armName, system, task);
      console.log(`${r.turns} turns, ${r.toolCalls} tool calls`);
      results.push(r);
      fs.writeFileSync(
        path.join(outDir, `${task.id}.${armName}.json`),
        JSON.stringify(r, null, 2),
      );
    }
  }

  fs.writeFileSync(
    path.join(outDir, "inputs.json"),
    JSON.stringify(
      {
        model: MODEL,
        maxTokens: MAX_TOKENS,
        maxTurns: MAX_TURNS,
        api: API,
        payer: PAYER,
        tasks: TASKS,
        tools: TOOLS,
        systemPrompts: ARMS,
        recipeSha: RECIPE.length,
        note:
          "Arms A and B share model, settings, tools, task prompts and API. " +
          "The only difference is the Recipe appended to arm B's system prompt.",
      },
      null,
      2,
    ),
  );

  const lines = ["# Bazantic A/B run", "", `- Model: \`${MODEL}\``,
    `- API: \`${API}\``, `- Payer: \`${PAYER}\``,
    `- Timestamp: ${stamp}`, "",
    "| Task | Arm | Turns | Tool calls | In tok | Out tok |",
    "|---|---|---|---|---|---|"];
  for (const r of results) {
    lines.push(
      `| ${r.task} | ${r.arm} | ${r.turns} | ${r.toolCalls} | ${r.usage.input_tokens} | ${r.usage.output_tokens} |`,
    );
  }
  lines.push("", "## Final answers", "");
  for (const task of TASKS) {
    lines.push(`### ${task.id}`, "", `> ${task.prompt}`, "");
    for (const armName of Object.keys(ARMS)) {
      const r = results.find((x) => x.task === task.id && x.arm === armName);
      lines.push(`#### ${armName}`, "", r.finalText || "(no text)", "");
    }
  }
  fs.writeFileSync(path.join(outDir, "SUMMARY.md"), lines.join("\n"));

  console.log(`\nWrote ${outDir}/SUMMARY.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
