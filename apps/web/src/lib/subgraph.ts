/**
 * Subgraph client. Replaces the direct PostgreSQL reads that the dashboard
 * and assistant used to do via packages/mcp/src/database/client.ts.
 *
 * Configuration (see .env.example):
 *   SUBGRAPH_URL   - Studio query URL or decentralised-network gateway URL
 *   GRAPH_API_KEY  - injected as Authorization: Bearer, or substituted into
 *                    a gateway URL containing the literal [api-key] token
 *
 * There is deliberately no mock/fixture fallback here: if the subgraph is
 * unreachable the caller gets an error, because "live data" is a hard
 * requirement of the track and silently serving stale data would hide that.
 */

export class SubgraphError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "SubgraphError";
  }
}

function endpoint(): string {
  const raw = process.env.SUBGRAPH_URL;
  if (!raw) {
    throw new SubgraphError(
      "SUBGRAPH_URL is not set. Point it at the LedgerMind subgraph " +
        "(see packages/subgraph/README.md).",
    );
  }
  const key = process.env.GRAPH_API_KEY;
  // Gateway URLs are of the form .../api/[api-key]/subgraphs/id/<id>
  if (raw.includes("[api-key]")) {
    if (!key) {
      throw new SubgraphError(
        "SUBGRAPH_URL contains [api-key] but GRAPH_API_KEY is not set.",
      );
    }
    return raw.replace("[api-key]", key);
  }
  return raw;
}

export interface GraphMeta {
  blockNumber: number;
  hasIndexingErrors: boolean;
  deployment: string;
}

export async function query<T>(
  document: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const url = endpoint();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = process.env.GRAPH_API_KEY;
  if (key && !url.includes(key)) {
    headers["Authorization"] = `Bearer ${key}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: document, variables }),
      cache: "no-store",
    });
  } catch (err) {
    throw new SubgraphError("Subgraph request failed", err);
  }

  if (!res.ok) {
    throw new SubgraphError(
      `Subgraph returned HTTP ${res.status}`,
      await res.text().catch(() => undefined),
    );
  }

  const body = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (body.errors?.length) {
    throw new SubgraphError(
      body.errors.map((e) => e.message).join("; "),
      body.errors,
    );
  }
  if (!body.data) {
    throw new SubgraphError("Subgraph returned no data");
  }
  return body.data;
}

/** Freshness probe - surfaced on every API response so callers can see lag. */
export async function meta(): Promise<GraphMeta> {
  const data = await query<{
    _meta: {
      block: { number: number };
      hasIndexingErrors: boolean;
      deployment: string;
    };
  }>(`{ _meta { block { number } hasIndexingErrors deployment } }`);
  return {
    blockNumber: data._meta.block.number,
    hasIndexingErrors: data._meta.hasIndexingErrors,
    deployment: data._meta.deployment,
  };
}

const INTENT_FIELDS = `
  id
  payer { id }
  agent { id }
  token
  totalCap
  perTxCap
  spent
  remainingCap
  toppedUp
  withdrawn
  startTime
  endTime
  metadataURI
  state
  revokedAt
  revokedBy
  revokeReason
  hasRestrictedMerchants
  allowedMerchants
  createdAt
  createdAtBlock
  createdTxHash
  lastActivityAt
  paymentCount
`;

export interface Intent {
  id: string;
  payer: { id: string };
  agent: { id: string };
  token: string;
  totalCap: string;
  perTxCap: string;
  spent: string;
  remainingCap: string;
  toppedUp: string;
  withdrawn: string;
  startTime: string;
  endTime: string;
  metadataURI: string;
  state: "Active" | "Revoked" | "Expired";
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  hasRestrictedMerchants: boolean;
  allowedMerchants: string[];
  createdAt: string;
  createdAtBlock: string;
  createdTxHash: string;
  lastActivityAt: string;
  paymentCount: number;
}

export interface Payment {
  id: string;
  intent: { id: string; metadataURI: string };
  agent: { id: string };
  merchant: { id: string };
  token: string;
  amount: string;
  receiptHash: string;
  receiptURI: string;
  spentAfter: string;
  capUtilizationBps: string;
  timestamp: string;
  blockNumber: string;
  txHash: string;
}

export async function listIntents(opts: {
  payer?: string;
  agent?: string;
  state?: string;
  first?: number;
  skip?: number;
}): Promise<Intent[]> {
  const where: string[] = [];
  if (opts.payer) where.push(`payer: $payer`);
  if (opts.agent) where.push(`agent: $agent`);
  if (opts.state) where.push(`state: $state`);
  const whereClause = where.length ? `where: { ${where.join(", ")} }` : "";

  const data = await query<{ paymentIntents: Intent[] }>(
    `query Intents($payer: String, $agent: String, $state: IntentState, $first: Int!, $skip: Int!) {
       paymentIntents(
         ${whereClause}
         first: $first
         skip: $skip
         orderBy: createdAt
         orderDirection: desc
       ) { ${INTENT_FIELDS} }
     }`,
    {
      payer: opts.payer?.toLowerCase() ?? null,
      agent: opts.agent?.toLowerCase() ?? null,
      state: opts.state ?? null,
      first: Math.min(opts.first ?? 50, 200),
      skip: opts.skip ?? 0,
    },
  );
  return data.paymentIntents;
}

export async function getIntent(address: string): Promise<Intent | null> {
  const data = await query<{ paymentIntent: Intent | null }>(
    `query Intent($id: ID!) { paymentIntent(id: $id) { ${INTENT_FIELDS} } }`,
    { id: address.toLowerCase() },
  );
  return data.paymentIntent;
}

export async function listPayments(opts: {
  intent?: string;
  agent?: string;
  merchant?: string;
  since?: number;
  first?: number;
}): Promise<Payment[]> {
  const where: string[] = [];
  if (opts.intent) where.push(`intent: $intent`);
  if (opts.agent) where.push(`agent: $agent`);
  if (opts.merchant) where.push(`merchant: $merchant`);
  if (opts.since) where.push(`timestamp_gte: $since`);
  const whereClause = where.length ? `where: { ${where.join(", ")} }` : "";

  const data = await query<{ payments: Payment[] }>(
    `query Payments($intent: String, $agent: String, $merchant: String, $since: BigInt, $first: Int!) {
       payments(
         ${whereClause}
         first: $first
         orderBy: timestamp
         orderDirection: desc
       ) {
         id
         intent { id metadataURI }
         agent { id }
         merchant { id }
         token
         amount
         receiptHash
         receiptURI
         spentAfter
         capUtilizationBps
         timestamp
         blockNumber
         txHash
       }
     }`,
    {
      intent: opts.intent?.toLowerCase() ?? null,
      agent: opts.agent?.toLowerCase() ?? null,
      merchant: opts.merchant?.toLowerCase() ?? null,
      since: opts.since ? String(opts.since) : null,
      first: Math.min(opts.first ?? 100, 500),
    },
  );
  return data.payments;
}

export interface SpendingContext {
  protocol: {
    intentCount: number;
    activeIntentCount: number;
    revokedIntentCount: number;
    paymentCount: number;
    totalVolume: string;
    totalAuthorized: string;
  } | null;
  intents: Intent[];
  payments: Payment[];
  snapshots: Array<{
    dayStartTimestamp: string;
    paymentCount: number;
    amountSpent: string;
    uniqueMerchantCount: number;
    largestPayment: string;
    intent: { id: string; metadataURI: string };
  }>;
  topMerchants: Array<{
    id: string;
    totalReceived: string;
    paymentCount: number;
    lastPaidAt: string;
  }>;
}

/**
 * One round trip that gathers everything the assistant reasons over.
 * The old implementation issued a SELECT per panel and summed in JS.
 */
export async function spendingContext(
  payer: string,
  sinceTimestamp: number,
): Promise<SpendingContext> {
  return query<SpendingContext>(
    `query Context($payer: String!, $since: BigInt!) {
       protocol(id: "0x676c6f62616c") {
         intentCount
         activeIntentCount
         revokedIntentCount
         paymentCount
         totalVolume
         totalAuthorized
       }
       intents: paymentIntents(
         where: { payer: $payer }
         first: 100
         orderBy: createdAt
         orderDirection: desc
       ) { ${INTENT_FIELDS} }
       payments(
         where: { payer: $payer, timestamp_gte: $since }
         first: 500
         orderBy: timestamp
         orderDirection: desc
       ) {
         id
         intent { id metadataURI }
         agent { id }
         merchant { id }
         token
         amount
         receiptHash
         receiptURI
         spentAfter
         capUtilizationBps
         timestamp
         blockNumber
         txHash
       }
       snapshots: intentDailySnapshots(
         where: { dayStartTimestamp_gte: $since }
         first: 200
         orderBy: dayStartTimestamp
         orderDirection: desc
       ) {
         dayStartTimestamp
         paymentCount
         amountSpent
         uniqueMerchantCount
         largestPayment
         intent { id metadataURI }
       }
       topMerchants: merchants(
         first: 20
         orderBy: totalReceived
         orderDirection: desc
       ) {
         id
         totalReceived
         paymentCount
         lastPaidAt
       }
     }`,
    { payer: payer.toLowerCase(), since: String(sinceTimestamp) },
  );
}
