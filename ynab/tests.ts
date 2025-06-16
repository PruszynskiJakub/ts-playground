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
  
  // Check if we have metrics from the prompt results
  const metrics = summary.prompts?.[0]?.metrics;
  if (!metrics) {
    console.log('⚠️  No test metrics found. This might indicate an issue with the evaluation.');
    console.log('═'.repeat(80));
    return;
  }
  
  const passed = metrics.testPassCount || 0;
  const failed = metrics.testFailCount || 0;
  const errors = metrics.testErrorCount || 0;
  const total = passed + failed + errors;
  
  console.log(`📈 Overall Results:`);
  console.log(`   ✅ Tests Passed: ${passed}`);
  console.log(`   ❌ Tests Failed: ${failed}`);
  console.log(`   ⚠️  Tests Errored: ${errors}`);
  console.log(`   📊 Total Tests: ${total}`);
  console.log(`   🎯 Success Rate: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);
  console.log('');
  
  console.log(`🔍 Assertion Details:`);
  console.log(`   ✅ Assertions Passed: ${metrics.assertPassCount || 0}`);
  console.log(`   ❌ Assertions Failed: ${metrics.assertFailCount || 0}`);
  console.log('');
  
  if (metrics.tokenUsage) {
    console.log(`💰 Token Usage:`);
    console.log(`   📝 Total Tokens: ${metrics.tokenUsage.total || 'N/A'}`);
    console.log(`   🔄 Cached Tokens: ${metrics.tokenUsage.cached || 'N/A'}`);
    console.log(`   📞 API Requests: ${metrics.tokenUsage.numRequests || 'N/A'}`);
    console.log(`   💵 Estimated Cost: $${metrics.cost?.toFixed(4) || 'N/A'}`);
  }
  
  console.log('═'.repeat(80));
  
  // Show individual test case info
  console.log('📋 Test Cases:');
  dataset.forEach((testCase, index) => {
    console.log(`   ${index + 1}. "${testCase.query.substring(0, 60)}${testCase.query.length > 60 ? '...' : ''}"`);
    console.log(`      Assertions: ${testCase.assert.length}`);
  });
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


