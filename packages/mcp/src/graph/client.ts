/**
 * Subgraph client for the MCP server.
 *
 * Read tools query the LedgerMind subgraph instead of fanning out across RPC
 * calls. Write tools (create/execute/revoke/top-up) still go straight to the
 * chain - they have to.
 *
 * There is no fallback to RPC or to the retired PostgreSQL indexer: if the
 * subgraph is unreachable the tool reports that, rather than silently serving
 * data from somewhere else.
 */

export class SubgraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubgraphError';
  }
}

function endpoint(): string {
  const raw = process.env.SUBGRAPH_URL;
  if (!raw) {
    throw new SubgraphError(
      'SUBGRAPH_URL is not set. Point it at the LedgerMind subgraph ' +
        '(see packages/subgraph/README.md).',
    );
  }
  const key = process.env.GRAPH_API_KEY;
  if (raw.includes('[api-key]')) {
    if (!key) {
      throw new SubgraphError(
        'SUBGRAPH_URL contains [api-key] but GRAPH_API_KEY is not set.',
      );
    }
    return raw.replace('[api-key]', key);
  }
  return raw;
}

export async function query<T>(
  document: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const url = endpoint();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = process.env.GRAPH_API_KEY;
  if (key && !url.includes(key)) headers['Authorization'] = `Bearer ${key}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: document, variables }),
    });
  } catch (err) {
    throw new SubgraphError(`Subgraph request failed: ${String(err)}`);
  }

  if (!res.ok) {
    throw new SubgraphError(`Subgraph returned HTTP ${res.status}`);
  }

  const body = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (body.errors?.length) {
    throw new SubgraphError(body.errors.map((e) => e.message).join('; '));
  }
  if (!body.data) throw new SubgraphError('Subgraph returned no data');
  return body.data;
}

export interface GraphIntent {
  id: string;
  payer: { id: string };
  agent: { id: string };
  token: string;
  totalCap: string;
  perTxCap: string;
  spent: string;
  toppedUp: string;
  withdrawn: string;
  startTime: string;
  endTime: string;
  state: 'Active' | 'Revoked' | 'Expired';
  metadataURI: string;
}

const FIELDS = `
  id
  payer { id }
  agent { id }
  token
  totalCap
  perTxCap
  spent
  toppedUp
  withdrawn
  startTime
  endTime
  state
  metadataURI
`;

export async function fetchIntents(opts: {
  payer?: string;
  agent?: string;
  state?: string;
  first: number;
  skip: number;
}): Promise<GraphIntent[]> {
  const where: string[] = [];
  if (opts.payer) where.push('payer: $payer');
  if (opts.agent) where.push('agent: $agent');
  if (opts.state) where.push('state: $state');
  const whereClause = where.length ? `where: { ${where.join(', ')} }` : '';

  const data = await query<{ paymentIntents: GraphIntent[] }>(
    `query Intents($payer: String, $agent: String, $state: IntentState, $first: Int!, $skip: Int!) {
       paymentIntents(
         ${whereClause}
         first: $first
         skip: $skip
         orderBy: createdAt
         orderDirection: desc
       ) { ${FIELDS} }
     }`,
    {
      payer: opts.payer?.toLowerCase() ?? null,
      agent: opts.agent?.toLowerCase() ?? null,
      state: opts.state ?? null,
      first: opts.first,
      skip: opts.skip,
    },
  );
  return data.paymentIntents;
}

/** Indexed block height, so tools can report how fresh their answer is. */
export async function indexedBlock(): Promise<number> {
  const d = await query<{ _meta: { block: { number: number } } }>(
    '{ _meta { block { number } } }',
  );
  return d._meta.block.number;
}
