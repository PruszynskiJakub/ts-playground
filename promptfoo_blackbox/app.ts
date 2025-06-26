import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function chainPrompts(userInput: string): Promise<string> {
  // First prompt: Analyze the input
  const firstResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Analyze this input and identify the main topic or intent: "${userInput}"`
      }
    ],
    max_tokens: 100
  });

  const analysis = firstResponse.choices[0].message.content || '';

  // Second prompt: Generate response based on analysis
  const secondResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Based on this analysis: "${analysis}", provide a helpful response to the original input: "${userInput}"`
      }
    ],
    max_tokens: 200
  });

  return secondResponse.choices[0].message.content || '';
}

async function main() {
  const userInput = process.argv[2];
  
  if (!userInput) {
    console.error('Please provide an input argument');
    process.exit(1);
  }

  try {
    const result = await chainPrompts(userInput);
    console.log(result);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();