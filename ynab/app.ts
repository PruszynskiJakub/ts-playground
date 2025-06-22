import 'dotenv/config';
import * as ynab from 'ynab';
import OpenAI from 'openai';
import { createYnabService } from './ynab.service';
import { createOpenAIService } from './openai.service';
import {env, serve} from "bun";

const YNAB_API_KEY = env.YNAB_PERSONAL_ACCESS_TOKEN;
const BUDGET_ID = env.YNAB_BUDGET_ID;

if (!YNAB_API_KEY || !BUDGET_ID) {
  console.error('Missing required environment variables: YNAB_PERSONAL_ACCESS_TOKEN and YNAB_BUDGET_ID');
  process.exit(1);
}

async function main() {
  const query = "I bought a cup of coffee for 19.99, Bus tickets for 99.75.";
  
  if (!query) {
    console.error('Usage: npm run ynab "your transaction query"');
    console.error('Example: npm run ynab "Spent 50 PLN on groceries at Biedronka"');
    process.exit(1);
  }

  console.log('Processing transaction:', query);

  try {
    // Initialize services
    const ynabClient = new ynab.API(YNAB_API_KEY!);
    const openaiClient = new OpenAI();
    const openaiService = createOpenAIService(openaiClient);
    const ynabService = createYnabService(ynabClient, BUDGET_ID!, openaiService);

    // Add transaction
    const result = await ynabService.addTransaction(query);

    if (result.success) {
      console.log('✅ Transaction added successfully!');
      console.log('Transaction ID:', result.transactionId);
    } else {
      console.error('❌ Failed to add transaction:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);