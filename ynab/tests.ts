import promptfoo from 'promptfoo';
import { splitTransactionPrompt } from './prompts.js';

// Test dataset with various transaction scenarios
const dataset = [
  {
    query: "I bought a cup of coffee for 19.99PLN, also spend 177.65 for building materials, and another 23PLN for Uber.",
    assert: [
      {
        type: 'contains' as const,
        value: "19.99"
      },
      {
        type: 'contains' as const,
        value: "177.65"
      },
      {
        type: 'contains' as const,
        value: "23"
      },
      {
        type: 'is-json' as const
      }
    ]
  },
  {
    query: "Transferred 500 from business account then paid 200PLN for the accountant.",
    assert: [
      {
        type: 'contains' as const,
        value: "500"
      },
      {
        type: 'contains' as const,
        value: "200"
      },
      {
        type: 'is-json' as const
      }
    ]
  },
  {
    query: "Bought something for money and paid invalid$ for coffee",
    assert: [
      {
        type: 'contains' as const,
        value: "INVALID_AMOUNT"
      },
      {
        type: 'is-json' as const
      }
    ]
  },
  {
    query: "Spent 50.99 and then -30EUR on food",
    assert: [
      {
        type: 'contains' as const,
        value: "50.99"
      },
      {
        type: 'contains' as const,
        value: "INVALID_AMOUNT"
      },
      {
        type: 'is-json' as const
      }
    ]
  }
];

// Create prompt with system message and user variable
const prompt = `${splitTransactionPrompt()}

User query: {{body}}`;

// Display results in a formatted table
const displayResultsAsTable = (summary: any) => {
  console.log('\n📊 Test Results Summary:');
  console.log('═'.repeat(80));
  
  if (!summary || !summary.results || summary.results.length === 0) {
    console.log('⚠️  No test results found. This might indicate an issue with the evaluation.');
    console.log('═'.repeat(80));
    return;
  }
  
  let passed = 0;
  let failed = 0;
  
  summary.results.forEach((result: any, index: number) => {
    const testCase = dataset[index];
    const success = result.success;
    
    if (success) {
      passed++;
      console.log(`✅ Test ${index + 1}: PASSED`);
      console.log(`   Query: "${testCase.query}"`);
      console.log(`   Response: ${result.response?.output?.substring(0, 100)}...`);
    } else {
      failed++;
      console.log(`❌ Test ${index + 1}: FAILED`);
      console.log(`   Query: "${testCase.query}"`);
      console.log(`   Response: ${result.response?.output?.substring(0, 100)}...`);
      if (result.gradingResult) {
        console.log(`   Failed assertions: ${result.gradingResult.componentResults?.filter((c: any) => !c.pass).length || 0}`);
      }
    }
    console.log('');
  });
  
  console.log('═'.repeat(80));
  console.log(`📈 Results: ${passed} passed, ${failed} failed, ${summary.results.length} total`);
  console.log(`🎯 Success Rate: ${((passed / summary.results.length) * 100).toFixed(1)}%`);
  
  if (summary.stats) {
    console.log(`💰 Token Usage: ${summary.stats.tokenUsage?.total || 'N/A'} total tokens`);
  }
};

export const runTest = async () => {
  console.log('🚀 Starting promptfoo evaluation for split transaction prompt...');
  
  const results = await promptfoo.evaluate(
    {
      prompts: [prompt],
      providers: ["openai:gpt-4.1"],
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

  console.log("Evaluation completed!");
  displayResultsAsTable(results);
  
  return results;
};

runTest().catch(console.error);


