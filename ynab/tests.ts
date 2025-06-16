import promptfoo from 'promptfoo';
import { splitTransactionPrompt } from './prompts.js';

// Test dataset with various transaction scenarios
const dataset = [
  {
    query: "I bought a cup of coffee for 19.99PLN, also spend 177.65 for building materials, and another 23PLN for Uber.",
    assert: [
      {
        type: 'contains-json' as const,
        value: { result: [{ query: "Spent 19.99 PLN on a cup of coffee" }] }
      },
      {
        type: 'contains-json' as const, 
        value: { result: [{ query: "Purchased building materials for 177.65 PLN" }] }
      },
      {
        type: 'contains-json' as const,
        value: { result: [{ query: "Paid 23 PLN for Uber" }] }
      }
    ]
  },
  {
    query: "Transferred 500 from business account then paid 200PLN for the accountant.",
    assert: [
      {
        type: 'contains-json' as const,
        value: { result: [{ query: "Transferred 500 PLN from business account" }] }
      },
      {
        type: 'contains-json' as const,
        value: { result: [{ query: "Paid 200 PLN for accountant services" }] }
      }
    ]
  },
  {
    query: "Bought something for money and paid invalid$ for coffee",
    assert: [
      {
        type: 'contains-json' as const,
        value: { result: [{ error_code: "INVALID_AMOUNT" }] }
      }
    ]
  },
  {
    query: "Spent 50.99 and then -30EUR on food",
    assert: [
      {
        type: 'contains-json' as const,
        value: { result: [{ query: "Spent 50.99 PLN" }] }
      },
      {
        type: 'contains-json' as const,
        value: { result: [{ error_code: "INVALID_AMOUNT" }] }
      }
    ]
  }
];

// Create prompt with system message and user variable
const prompt = `${splitTransactionPrompt()}

User query: {{body}}`;

// Display results in a formatted table
const displayResultsAsTable = (results: any[]) => {
  console.log('\n📊 Test Results Summary:');
  console.log('═'.repeat(80));
  
  if (!results || results.length === 0) {
    console.log('⚠️  No test results found. This might indicate an issue with the evaluation.');
    console.log('═'.repeat(80));
    return;
  }
  
  let passed = 0;
  let failed = 0;
  
  results.forEach((result, index) => {
    const testCase = dataset[index];
    const success = result.success;
    
    if (success) {
      passed++;
      console.log(`✅ Test ${index + 1}: PASSED`);
    } else {
      failed++;
      console.log(`❌ Test ${index + 1}: FAILED`);
      console.log(`   Query: ${testCase.query}`);
      console.log(`   Error: ${result.error || 'Assertion failed'}`);
    }
  });
  
  console.log('═'.repeat(80));
  console.log(`📈 Results: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log(`🎯 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
};

export const runTest = async () => {
  console.log('🚀 Starting promptfoo evaluation for split transaction prompt...');
  
  const results = await promptfoo.evaluate(
    {
      prompts: [prompt],
      providers: ["openai:gpt-4.1-mini"],
      tests: dataset.map(
        ({ query, assert }) => ({
          vars: { body: query },
          assert,
        })
      ),
      writeLatestResults: true, // write results to disk so they can be viewed in web viewer
    },
    {
      maxConcurrency: 4,
    }
  );

  console.log("Evaluation Results:");
  console.log("Raw results object:", JSON.stringify(results, null, 2));
  displayResultsAsTable(results.results || []);
  
  return results;
};

// Run the test if this file is executed directly
  runTest().catch(console.error);

