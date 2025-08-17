import { ContractFunctionExecutionError } from 'viem';

export interface ParsedError {
  title: string;
  description: string;
  suggestion?: string;
}

export function parseContractError(error: any): ParsedError {
  // Handle Viem contract execution errors
  if (error instanceof ContractFunctionExecutionError || error.name === 'ContractFunctionExecutionError') {
    const errorMessage = error.message || error.details || '';
    
    // Parse specific PaymentIntent contract errors
    if (errorMessage.includes('PaymentIntent: exceeds per tx cap')) {
      return {
        title: 'Transaction Amount Too High',
        description: 'The payment amount exceeds the per-transaction limit set for this payment intent.',
        suggestion: 'Try a smaller amount or check the intent\'s per-transaction cap in the details below.'
      };
    }
    
    if (errorMessage.includes('PaymentIntent: insufficient balance')) {
      return {
        title: 'Insufficient Intent Balance',
        description: 'The payment intent doesn\'t have enough USDC balance to complete this payment.',
        suggestion: 'The intent needs to be topped up with more USDC tokens by the payer.'
      };
    }
    
    if (errorMessage.includes('PaymentIntent: exceeds total cap')) {
      return {
        title: 'Total Spending Limit Reached',
        description: 'This payment would exceed the total spending limit for this payment intent.',
        suggestion: 'The spending limit has been reached. A new intent may need to be created.'
      };
    }
    
    if (errorMessage.includes('PaymentIntent: not agent')) {
      return {
        title: 'Unauthorized Agent',
        description: 'Only the authorized agent can execute payments for this intent.',
        suggestion: 'Make sure the correct agent wallet is configured and has the proper permissions.'
      };
    }
    
    if (errorMessage.includes('PaymentIntent: not active')) {
      return {
        title: 'Intent Not Active',
        description: 'This payment intent is no longer active (it may be expired or revoked).',
        suggestion: 'Check the intent status and create a new one if needed.'
      };
    }
    
    if (errorMessage.includes('PaymentIntent: too early')) {
      return {
        title: 'Payment Too Early',
        description: 'This payment intent is not yet active (start time has not been reached).',
        suggestion: 'Wait until the intent\'s start time to execute payments.'
      };
    }
    
    if (errorMessage.includes('PaymentIntent: too late')) {
      return {
        title: 'Payment Intent Expired',
        description: 'This payment intent has expired and can no longer be used.',
        suggestion: 'Create a new payment intent to continue making payments.'
      };
    }
    
    if (errorMessage.includes('PaymentIntent: merchant not allowed')) {
      return {
        title: 'Merchant Not Authorized',
        description: 'The recipient address is not in the allowed merchants list for this intent.',
        suggestion: 'Use an authorized merchant address or update the intent\'s merchant allowlist.'
      };
    }
    
    // Handle wallet/gas errors
    if (errorMessage.includes('insufficient funds')) {
      return {
        title: 'Insufficient Gas Funds',
        description: 'The agent wallet doesn\'t have enough SEI tokens to pay for gas fees.',
        suggestion: 'Send some SEI tokens to the agent wallet to cover transaction fees.'
      };
    }
    
    if (errorMessage.includes('user rejected')) {
      return {
        title: 'Transaction Rejected',
        description: 'The transaction was rejected in the wallet.',
        suggestion: 'Please approve the transaction to proceed.'
      };
    }
  }
  
  // Handle network/RPC errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return {
      title: 'Network Error',
      description: 'Failed to connect to the Sei network.',
      suggestion: 'Check your internet connection and try again.'
    };
  }
  
  // Generic error fallback
  return {
    title: 'Transaction Failed',
    description: error.message || 'An unexpected error occurred during the transaction.',
    suggestion: 'Please try again or contact support if the issue persists.'
  };
}

export function formatErrorForDisplay(error: any): string {
  const parsed = parseContractError(error);
  return `${parsed.title}: ${parsed.description}${parsed.suggestion ? ` ${parsed.suggestion}` : ''}`;
}