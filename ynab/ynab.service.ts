import * as ynab from 'ynab';
import type { NewTransaction } from 'ynab';
import { createOpenAIService } from './openai.service';

interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Factory function that takes a YNAB API client, budget ID, and OpenAI service
export const createYnabService = (
  client: ynab.API, 
  budgetId: string,
  openaiService: ReturnType<typeof createOpenAIService>
) => {

  const parseTransactionQuery = async (query: string): Promise<NewTransaction> => {
    try {
      // Use OpenAI to interpret the transaction query
      const response = await openaiService.chatCompletion([
        {
          role: 'system',
          content: `You are a transaction parser for YNAB. Parse the user's transaction query and return ONLY a JSON object with these fields:
          - amount: number in dollars (positive for income, negative for expenses)
          - payee: string (merchant/person name)
          - memo: string (original query)
          
          Examples:
          "Spent $50 on groceries at Walmart" -> {"amount": -50, "payee": "Walmart", "memo": "Spent $50 on groceries at Walmart"}
          "Got paid $1000 salary" -> {"amount": 1000, "payee": "Salary", "memo": "Got paid $1000 salary"}
          
          Return ONLY the JSON object, no other text.`
        },
        {
          role: 'user',
          content: query
        }
      ], { temperature: 0.1 });

      if ('choices' in response) {
        const parsed = JSON.parse(response.choices[0].message.content || '{}');
        
        return {
          account_id: '', // Will be set later
          payee_name: parsed.payee || 'Manual Entry',
          amount: (parsed.amount || 0) * 1000, // Convert to milliunits
          memo: parsed.memo || query,
          cleared: ynab.TransactionClearedStatus.Uncleared,
          date: new Date().toISOString().split('T')[0]
        };
      }
    } catch (error) {
      console.warn('Failed to parse with OpenAI, falling back to simple parsing:', error);
    }

    // Fallback to simple parsing
    const amountMatch = query.match(/\$?(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) * 1000 : 0; // YNAB uses milliunits
    
    const description = query.replace(/\$?\d+(?:\.\d{2})?/, '').trim();
    const payee = description.replace(/^(for|on|to)\s+/i, '').trim() || 'Manual Entry';
    
    return {
      account_id: '', // Will be set later
      payee_name: payee,
      amount: -Math.abs(amount), // Negative for outflow
      memo: query,
      cleared: ynab.TransactionClearedStatus.Uncleared,
      date: new Date().toISOString().split('T')[0]
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

      const transactionData = await parseTransactionQuery(query);
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