import * as ynab from 'ynab';
import type { NewTransaction } from 'ynab';

interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Factory function that takes a YNAB API client and budget ID
export const createYnabService = (client: ynab.API, budgetId: string) => {

  const parseTransactionQuery = (query: string): NewTransaction => {
    // Simple parsing - extract amount and description
    const amountMatch = query.match(/\$?(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) * 1000 : 0; // YNAB uses milliunits
    
    // Extract description after amount
    const description = query.replace(/\$?\d+(?:\.\d{2})?/, '').trim();
    const payee = description.replace(/^(for|on|to)\s+/i, '').trim() || 'Manual Entry';
    
    return {
      account_id: '', // Will be set later
      payee_name: payee,
      amount: -Math.abs(amount), // Negative for outflow
      memo: query,
      cleared: ynab.TransactionClearedStatus.Uncleared,
      date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    };
  };

  const addTransaction = async (query: string): Promise<TransactionResult> => {
    try {
      // Get first account
      const accountsResponse = await client.accounts.getAccounts(budgetId);
      const firstAccount = accountsResponse.data.accounts.find(acc => !acc.closed);
      
      if (!firstAccount) {
        return { success: false, error: 'No open accounts found' };
      }

      const transactionData = parseTransactionQuery(query);
      transactionData.account_id = firstAccount.id;

      const response = await client.transactions.createTransaction(budgetId, {
        transaction: transactionData
      });

      return {
        success: true,
        transactionId: response.data.transaction?.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  return {
    addTransaction
  };
};