/**
 * OpenAPI 3.1 description of the LedgerMind v1 API.
 *
 * This is the document registered with the Bazantic x402/MPP Gateway. It is
 * generated rather than checked in as static JSON so the server URL follows
 * the deployment (preview vs production) without editing.
 */
export function spec(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "LedgerMind API",
      version: "1.0.0",
      description:
        "Read on-chain spending authority for AI agents. A payment intent is " +
        "a smart contract that holds funds and enforces caps (total, per-tx), " +
        "a time window, and an optional merchant allowlist. An agent key can " +
        "spend from it without holding the payer's funds, and the payer can " +
        "revoke it at any time.\n\n" +
        "All data is indexed by a subgraph on Sei Atlantic testnet. Every " +
        "response includes `source.indexedBlock` so a caller can judge " +
        "freshness.",
      license: { name: "MIT" },
    },
    servers: [{ url: origin, description: "LedgerMind deployment" }],
    tags: [
      { name: "intents", description: "Spending authorities" },
      { name: "payments", description: "Executed agent payments" },
      { name: "analysis", description: "Model-generated review and actions" },
    ],
    paths: {
      "/api/v1/intents": {
        get: {
          operationId: "listIntents",
          tags: ["intents"],
          summary: "List payment intents",
          description:
            "Returns spending authorities, newest first. Filter by payer to " +
            "see what a person has authorised, or by agent to see what an " +
            "agent is allowed to spend.",
          parameters: [
            {
              name: "payer",
              in: "query",
              schema: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
              description: "Address that funded and owns the intents.",
            },
            {
              name: "agent",
              in: "query",
              schema: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
              description: "Agent key authorised to spend.",
            },
            {
              name: "state",
              in: "query",
              schema: {
                type: "string",
                enum: ["Active", "Revoked", "Expired"],
              },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 50, maximum: 200 },
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            "200": {
              description: "Matching intents",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/IntentListResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "503": { $ref: "#/components/responses/Unavailable" },
          },
        },
      },
      "/api/v1/intents/{address}": {
        get: {
          operationId: "getIntent",
          tags: ["intents"],
          summary: "Get one intent with its payment history",
          parameters: [
            {
              name: "address",
              in: "path",
              required: true,
              schema: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
            },
          ],
          responses: {
            "200": {
              description: "The intent and its payments",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/IntentDetailResponse" },
                },
              },
            },
            "404": { description: "Not indexed" },
            "503": { $ref: "#/components/responses/Unavailable" },
          },
        },
      },
      "/api/v1/payments": {
        get: {
          operationId: "listPayments",
          tags: ["payments"],
          summary: "List executed payments",
          description:
            "Each payment carries a receiptHash committing to the off-chain " +
            "context that justified it, so spending can be audited after the " +
            "fact.",
          parameters: [
            {
              name: "intent",
              in: "query",
              schema: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
            },
            {
              name: "agent",
              in: "query",
              schema: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
            },
            {
              name: "merchant",
              in: "query",
              schema: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
            },
            {
              name: "since",
              in: "query",
              schema: { type: "integer" },
              description: "Unix seconds; only payments at or after this time.",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 100, maximum: 500 },
            },
          ],
          responses: {
            "200": {
              description: "Matching payments",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PaymentListResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "503": { $ref: "#/components/responses/Unavailable" },
          },
        },
      },
      "/api/v1/analyze": {
        post: {
          operationId: "analyzeSpending",
          tags: ["analysis"],
          summary: "Review a payer's spending authority and recommend actions",
          description:
            "Pulls the payer's intents, payments and daily rollups from the " +
            "subgraph and returns ranked findings plus concrete actions " +
            "(revoke, withdraw remainder, resize caps, restrict merchants), " +
            "each with the capital it recovers. Use this instead of fetching " +
            "raw lists when the caller wants a decision rather than data.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["payer"],
                  properties: {
                    payer: {
                      type: "string",
                      pattern: "^0x[0-9a-fA-F]{40}$",
                      description: "Payer whose authority is being reviewed.",
                    },
                    question: {
                      type: "string",
                      description:
                        "Optional focus, e.g. 'am I over-exposed to any one agent?'",
                    },
                    windowDays: {
                      type: "integer",
                      default: 90,
                      minimum: 1,
                      maximum: 365,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Findings and recommended actions",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AnalysisResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "503": { $ref: "#/components/responses/Unavailable" },
          },
        },
      },
    },
    components: {
      responses: {
        BadRequest: {
          description: "Malformed parameters",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Unavailable: {
          description: "Subgraph unreachable; no cached fallback is served",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            ok: { type: "boolean", const: false },
            error: {
              type: "object",
              properties: {
                type: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
        Source: {
          type: "object",
          description: "Provenance and freshness of the indexed data.",
          properties: {
            indexer: { type: "string", const: "the-graph" },
            network: { type: "string", const: "sei-atlantic" },
            indexedBlock: { type: "integer" },
            hasIndexingErrors: { type: "boolean" },
            deployment: { type: "string" },
          },
        },
        Intent: {
          type: "object",
          description:
            "A spending authority. Amounts are base units of the token " +
            "(USDC has 6 decimals), as decimal strings.",
          properties: {
            id: { type: "string", description: "Intent contract address" },
            payer: {
              type: "object",
              properties: { id: { type: "string" } },
            },
            agent: {
              type: "object",
              properties: { id: { type: "string" } },
            },
            token: { type: "string" },
            totalCap: { type: "string", description: "Lifetime spend ceiling" },
            perTxCap: { type: "string", description: "Per-payment ceiling" },
            spent: { type: "string" },
            remainingCap: { type: "string" },
            toppedUp: { type: "string", description: "Total funded" },
            withdrawn: { type: "string" },
            startTime: { type: "string" },
            endTime: { type: "string" },
            metadataURI: {
              type: "string",
              description: "Purpose/notes set by the payer at creation.",
            },
            state: {
              type: "string",
              enum: ["Active", "Revoked", "Expired"],
            },
            revokeReason: { type: "string", nullable: true },
            hasRestrictedMerchants: {
              type: "boolean",
              description: "False means the agent may pay any address.",
            },
            allowedMerchants: { type: "array", items: { type: "string" } },
            paymentCount: { type: "integer" },
            createdAt: { type: "string" },
            createdTxHash: { type: "string" },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: { type: "string" },
            intent: {
              type: "object",
              properties: {
                id: { type: "string" },
                metadataURI: { type: "string" },
              },
            },
            agent: {
              type: "object",
              properties: { id: { type: "string" } },
            },
            merchant: {
              type: "object",
              properties: { id: { type: "string" } },
            },
            amount: { type: "string" },
            receiptHash: {
              type: "string",
              description:
                "keccak256 of the off-chain context that justified the spend.",
            },
            receiptURI: { type: "string" },
            capUtilizationBps: {
              type: "string",
              description: "Share of perTxCap this payment used, in bps.",
            },
            timestamp: { type: "string" },
            txHash: { type: "string" },
          },
        },
        IntentListResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean", const: true },
            data: { type: "array", items: { $ref: "#/components/schemas/Intent" } },
            count: { type: "integer" },
            source: { $ref: "#/components/schemas/Source" },
          },
        },
        IntentDetailResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean", const: true },
            data: {
              allOf: [
                { $ref: "#/components/schemas/Intent" },
                {
                  type: "object",
                  properties: {
                    payments: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Payment" },
                    },
                  },
                },
              ],
            },
            source: { $ref: "#/components/schemas/Source" },
          },
        },
        PaymentListResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean", const: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Payment" },
            },
            count: { type: "integer" },
            totalAmount: { type: "string" },
            source: { $ref: "#/components/schemas/Source" },
          },
        },
        AnalysisResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean", const: true },
            data: {
              type: "object",
              properties: {
                headline: { type: "string" },
                riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                findings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      detail: { type: "string" },
                      evidence: { type: "array", items: { type: "string" } },
                    },
                  },
                },
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: {
                        type: "string",
                        enum: [
                          "revoke_intent",
                          "withdraw_remainder",
                          "reduce_total_cap",
                          "reduce_per_tx_cap",
                          "raise_per_tx_cap",
                          "restrict_merchants",
                          "top_up_intent",
                          "no_action",
                        ],
                      },
                      target: { type: "string" },
                      rationale: { type: "string" },
                      urgency: {
                        type: "string",
                        enum: ["now", "this_week", "monitor"],
                      },
                      recoversUsdc: { type: "number" },
                    },
                  },
                },
                dataGaps: { type: "array", items: { type: "string" } },
              },
            },
            facts: {
              type: "object",
              description:
                "The normalised subgraph data the analysis was derived from. " +
                "Returned so callers can verify every claim.",
            },
            source: { $ref: "#/components/schemas/Source" },
          },
        },
      },
    },
  };
}
