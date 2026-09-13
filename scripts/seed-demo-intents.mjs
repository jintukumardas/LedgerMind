#!/usr/bin/env node
/**
 * Seeds Sei Atlantic testnet with payment intents that exercise every branch
 * the spending assistant reasons about. Run once, during the event, so the
 * subgraph has genuinely live data created after its startBlock.
 *
 * Deliberately varied so the analysis has something real to find:
 *   1. well-sized, throttled   - payments near 100% of perTxCap
 *   2. over-authorised         - huge totalCap, negligible spend
 *   3. unrestricted merchants  - containment risk on an open allowlist
 *   4. revoked with idle funds - recoverable capital via withdrawRemainder
 *
 * Usage: node scripts/seed-demo-intents.mjs [--dry-run]
 */

import { ethers } from "../packages/mcp/node_modules/ethers/lib.esm/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");

// Load .env without adding a dependency.
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const RPC = process.env.SEI_RPC_HTTP;
const FACTORY = process.env.FACTORY_ADDRESS;
const USDC = process.env.USDC_ADDRESS;
const PK = process.env.PRIVATE_KEY_PAYER;

const FACTORY_ABI = [
  "function createIntent((address token,address agent,uint256 totalCap,uint256 perTxCap,uint64 start,uint64 end,address[] merchants,string metadataURI,bytes32 salt) params) external returns (address)",
  "event IntentCreated(address indexed payer, address indexed intent, address indexed agent, bytes32 salt)",
];
const INTENT_ABI = [
  "function topUp(uint256 amount) external",
  "function execute(address merchant, uint256 amount, bytes32 receiptHash, string receiptURI) external",
  "function revoke(string reason) external",
  "function limits() view returns ((uint256 totalCap,uint256 perTxCap,uint256 spent,uint64 start,uint64 end))",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PK, provider);

// Stand-in merchant addresses. Deterministic so runs are reproducible.
const MERCHANTS = {
  cloud: "0x1111111111111111111111111111111111111111",
  data: "0x2222222222222222222222222222222222222222",
  saas: "0x3333333333333333333333333333333333333333",
};

const now = () => Math.floor(Date.now() / 1000);
const usdc = (n) => ethers.parseUnits(String(n), 6);

const PLAN = [
  {
    key: "throttled",
    metadataURI: "Cloud infra autopay - GPU + storage, weekly",
    totalCap: usdc(2),
    perTxCap: usdc(0.5),
    fund: usdc(1.2),
    merchants: [MERCHANTS.cloud],
    payments: [
      { to: MERCHANTS.cloud, amount: usdc(0.49) },
      { to: MERCHANTS.cloud, amount: usdc(0.49) },
    ],
    revoke: null,
  },
  {
    key: "over-authorised",
    metadataURI: "Research paper + dataset subscriptions",
    totalCap: usdc(50),
    perTxCap: usdc(5),
    fund: usdc(0.4),
    merchants: [MERCHANTS.data],
    payments: [{ to: MERCHANTS.data, amount: usdc(0.1) }],
    revoke: null,
  },
  {
    key: "unrestricted",
    metadataURI: "General ops agent - discretionary spend",
    totalCap: usdc(10),
    perTxCap: usdc(2),
    fund: usdc(0.3),
    merchants: [], // no allowlist => agent may pay anyone
    payments: [],
    revoke: null,
  },
  {
    key: "revoked-idle",
    metadataURI: "Marketing tools trial - Q3",
    totalCap: usdc(5),
    perTxCap: usdc(1),
    fund: usdc(1.0),
    merchants: [MERCHANTS.saas],
    payments: [{ to: MERCHANTS.saas, amount: usdc(0.2) }],
    revoke: "Trial ended, tool not adopted",
  },
];

async function main() {
  const net = await provider.getNetwork();
  const block = await provider.getBlockNumber();
  const token = new ethers.Contract(USDC, ERC20_ABI, wallet);
  const balUsdc = await token.balanceOf(wallet.address);
  const balSei = await provider.getBalance(wallet.address);

  console.log(`chain      : ${net.chainId}`);
  console.log(`block      : ${block}`);
  console.log(`wallet     : ${wallet.address}`);
  console.log(`SEI        : ${ethers.formatEther(balSei)}`);
  console.log(`USDC       : ${ethers.formatUnits(balUsdc, 6)}`);

  const needed = PLAN.reduce((a, p) => a + p.fund, 0n);
  console.log(`USDC needed: ${ethers.formatUnits(needed, 6)}\n`);

  if (balUsdc < needed) {
    console.error("Insufficient USDC for the seed plan.");
    process.exit(1);
  }
  if (DRY) {
    console.log("--dry-run: stopping before any transaction.");
    return;
  }

  const factory = new ethers.Contract(FACTORY, FACTORY_ABI, wallet);
  const created = [];

  for (const p of PLAN) {
    console.log(`\n=== ${p.key} ===`);
    const params = {
      token: USDC,
      agent: wallet.address, // payer acts as agent for the demo
      totalCap: p.totalCap,
      perTxCap: p.perTxCap,
      start: now() - 60,
      end: now() + 60 * 60 * 24 * 30,
      merchants: p.merchants,
      metadataURI: p.metadataURI,
      // Factory re-hashes this with msg.sender and block.timestamp, so it only
      // needs to be distinct per intent.
      salt: ethers.keccak256(ethers.toUtf8Bytes(`ledgermind-${p.key}`)),
    };

    const tx = await factory.createIntent(params);
    const rc = await tx.wait();
    const ev = rc.logs
      .map((l) => {
        try {
          return factory.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "IntentCreated");
    const addr = ev.args.intent;
    console.log(`  created  ${addr}  (block ${rc.blockNumber})`);

    const intent = new ethers.Contract(addr, INTENT_ABI, wallet);

    const ap = await token.approve(addr, p.fund);
    await ap.wait();
    const tu = await intent.topUp(p.fund);
    await tu.wait();
    console.log(`  funded   ${ethers.formatUnits(p.fund, 6)} USDC`);

    for (const pay of p.payments) {
      const receipt = ethers.keccak256(
        ethers.toUtf8Bytes(
          JSON.stringify({ intent: addr, to: pay.to, at: now(), why: p.metadataURI }),
        ),
      );
      const ex = await intent.execute(
        pay.to,
        pay.amount,
        receipt,
        `ipfs://demo/${p.key}/${now()}`,
      );
      await ex.wait();
      console.log(`  paid     ${ethers.formatUnits(pay.amount, 6)} USDC -> ${pay.to}`);
    }

    if (p.revoke) {
      const rv = await intent.revoke(p.revoke);
      await rv.wait();
      console.log(`  revoked  "${p.revoke}"`);
    }

    created.push({ key: p.key, address: addr, block: rc.blockNumber });
  }

  const outPath = path.join(ROOT, "docs/demo-intents.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      { payer: wallet.address, chainId: Number(net.chainId), created },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${outPath}`);
  console.log(`\nFirst intent block: ${Math.min(...created.map((c) => c.block))}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
