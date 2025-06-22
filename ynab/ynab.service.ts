import * as ynab from 'ynab';
import type { NewTransaction } from 'ynab';
import { createOpenAIService } from './openai.service';
import { pickAccountsPrompt, pickAmountPrompt, pickCategoryPrompt } from './prompts';
import { accounts, categories } from './config';

interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

interface AccountSelection {
  account: {
    id: string;
    name: string;
    type: string;
  };
  payee?: {
    id: string;
    name: string;
    type: string;
  };
}

interface AmountInfo {
  type: 'inflow' | 'outflow';
  amount: number;
  currency: string;
}

interface CategoryInfo {
  category: {
    id: string;
    name: string;
    category_group_id: string;
    category_group_name: string;
  };
}

// Factory function that takes a YNAB API client, budget ID, and OpenAI service
export const createYnabService = (
  client: ynab.API, 
  budgetId: string,
  openaiService: ReturnType<typeof createOpenAIService>
) => {

  const parseAccountSelection = async (query: string): Promise<AccountSelection> => {
    try {
      const response = await openaiService.chatCompletion([
        {
          role: 'system',
          content: pickAccountsPrompt(accounts)
        },
        {
          role: 'user',
          content: query
        }
      ], { temperature: 0.1, jsonMode: true });

      if ('choices' in response) {
        const content = response.choices[0].message.content || '{}';
        console.log('Account parsing response:', content);
        const parsed = JSON.parse(content);
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse account selection, using default:', error);
    }

    // Fallback to default account
    return {
      account: {
        id: 'f642f5db-efcc-425e-a69e-59242628d143',
        name: 'Pekao - Basic',
        type: 'checking'
      }
    };
  };

  const parseAmountInfo = async (query: string): Promise<AmountInfo> => {
    try {
      const response = await openaiService.chatCompletion([
        {
          role: 'system',
          content: pickAmountPrompt()
        },
        {
          role: 'user',
          content: query
        }
      ], { temperature: 0.1 });

      if ('choices' in response) {
        const content = response.choices[0].message.content || '{}';
        console.log('Amount parsing response:', content);
        const parsed = JSON.parse(content);
        if (parsed.error) {
          throw new Error(parsed.error.message);
        }
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse amount info, using fallback:', error);
    }

    // Fallback parsing
    const amountMatch = query.match(/(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    
    return {
      type: 'outflow',
      amount: -Math.abs(amount),
      currency: 'PLN'
    };
  };

  const parseCategoryInfo = async (query: string): Promise<CategoryInfo> => {
    try {
      const response = await openaiService.chatCompletion([
        {
          role: 'system',
          content: pickCategoryPrompt(categories)
        },
        {
          role: 'user',
          content: query
        }
      ], { temperature: 0.1 });

      if ('choices' in response) {
        const content = response.choices[0].message.content || '{}';
        console.log('Category parsing response:', content);
        const parsed = JSON.parse(content);
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse category info, using uncategorized:', error);
    }

    // Fallback to uncategorized
    return {
      category: {
        id: 'c0b087da-25ec-4ccb-8f08-17ea30daea3a',
        name: 'Uncategorized',
        category_group_id: 'c7fcc1f5-fd40-4d39-9959-2105607595ef',
        category_group_name: 'Internal Master Category'
      }
    };
  };

  const parseTransactionQuery = async (query: string): Promise<NewTransaction> => {
    try {
      // Run all parsing operations in parallel
      const [accountSelection, amountInfo, categoryInfo] = await Promise.all([
        parseAccountSelection(query),
        parseAmountInfo(query),
        parseCategoryInfo(query)
      ]);

      const transaction: NewTransaction = {
        account_id: accountSelection.account.id,
        amount: Math.round(amountInfo.amount * 1000), // Convert to milliunits
        memo: query,
        cleared: ynab.TransactionClearedStatus.Uncleared,
        date: new Date().toISOString().split('T')[0],
        category_id: categoryInfo.category.id
      };

      // Set payee if it's a transfer or specific payee
      if (accountSelection.payee) {
        transaction.payee_name = accountSelection.payee.name;
      } else {
        // Extract payee from transaction description for regular purchases
        const payeeMatch = query.match(/(?:at|from|to)\s+(\D+?)(?:\s+for|\s+\d|$)/i);
        transaction.payee_name = payeeMatch?.[1]?.trim() || 'Manual Entry';
      }

      return transaction;
    } catch (error) {
      console.warn('Failed to parse transaction with specialized prompts, using fallback:', error);
      
      // Fallback to simple parsing
      const amountMatch = query.match(/(\d+(?:\.\d{2})?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) * 1000 : 0;
      
      return {
        account_id: 'f642f5db-efcc-425e-a69e-59242628d143', // Default account
        payee_name: 'Manual Entry',
        amount: -Math.abs(amount),
        memo: query,
        cleared: ynab.TransactionClearedStatus.Uncleared,
        date: new Date().toISOString().split('T')[0],
        category_id: 'c0b087da-25ec-4ccb-8f08-17ea30daea3a' // Uncategorized
      };
    }
  };

  const addTransaction = async (query: string): Promise<TransactionResult> => {
    try {
      const transactionData = await parseTransactionQuery(query);

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