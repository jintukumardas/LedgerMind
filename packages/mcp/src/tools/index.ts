import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createIntentTool, handleCreateIntent } from './create-intent.js';
import { executePaymentTool, handleExecutePayment } from './execute-payment.js';
import { revokeIntentTool, handleRevokeIntent } from './revoke-intent.js';
import { listIntentsTool, handleListIntents } from './list-intents.js';
import { topUpIntentTool, handleTopUpIntent } from './top-up-intent.js';

export const tools: Tool[] = [
  createIntentTool,
  executePaymentTool,
  revokeIntentTool,
  listIntentsTool,
  topUpIntentTool,
];

export const toolHandlers = {
  create_intent: handleCreateIntent,
  execute_payment: handleExecutePayment,
  revoke_intent: handleRevokeIntent,
  list_intents: handleListIntents,
  top_up_intent: handleTopUpIntent,
};

export type ToolName = keyof typeof toolHandlers;