import OpenAI from 'openai';
import { createOpenAIService } from './openai.service';
import { splitTransactionPrompt } from './prompts';

console.log('YNAB mini project started');

// Types for transaction parsing
interface TransactionResult {
  query: string;
  error_code?: string;
  error_message?: string;
}

interface SplitTransactionResponse {
  result: TransactionResult[];
}

// Validation function for the response structure
const validateSplitTransactionResponse = (data: unknown): data is SplitTransactionResponse => {
  if (typeof data !== 'object' || data === null) return false;
  
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.result)) return false;
  
  return obj.result.every(item => 
    typeof item === 'object' && 
    item !== null && 
    typeof (item as Record<string, unknown>).query === 'string'
  );
};

async function testSplitTransactionPrompt() {
  try {
    // Initialize OpenAI service
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    const openaiService = createOpenAIService(openaiClient);

    // Test input with multiple transactions
    const testInput = "I bought a cup of coffee for 19.99PLN, also spend 177.65 for building materials, and another 23PLN for Uber.";
    
    console.log('Testing split transaction prompt...');
    console.log('Input:', testInput);
    
    // Call OpenAI with the split transaction prompt
    const response = await openaiService.chatCompletion([
      {
        role: 'system',
        content: splitTransactionPrompt()
      },
      {
        role: 'user',
        content: testInput
      }
    ], { temperature: 0.1, model: "gpt-4.1" });

    if ('choices' in response && response.choices[0]?.message?.content) {
      const content = response.choices[0].message.content;
      console.log('Raw response:', content);
      
      try {
        const parsedResponse = JSON.parse(content) as unknown;
        
        if (validateSplitTransactionResponse(parsedResponse)) {
          console.log('\n✅ Successfully parsed response:');
          parsedResponse.result.forEach((transaction, index) => {
            if (transaction.error_code) {
              console.log(`${index + 1}. ❌ Error: ${transaction.query}`);
              console.log(`   Code: ${transaction.error_code}`);
              console.log(`   Message: ${transaction.error_message}`);
            } else {
              console.log(`${index + 1}. ✅ ${transaction.query}`);
            }
          });
        } else {
          console.error('❌ Response structure validation failed');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
      }
    } else {
      console.error('❌ No content in response');
    }
  } catch (error) {
    console.error('❌ Error testing split transaction prompt:', error);
  }
}

// Run the test
testSplitTransactionPrompt();