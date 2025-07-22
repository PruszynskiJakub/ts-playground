import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import {QdrantVectorStore} from "@langchain/qdrant";
import {readFileSync} from "fs";
import {join} from "path";
import { z } from "zod";

console.log('Hello from langgraph v1!');

const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0
});


const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-large"
});


const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: "memories",
});

const memorySchema = z.object({
  content: z.string().describe("Enhanced and rephrased memory content that is descriptive and searchable"),
  category: z.string().describe("The main category from the memory structure (e.g., personal, professional, educational, creative, lifestyle, social)"),
  subcategory: z.string().describe("The specific subcategory within the chosen category"),
  metadata: z.object({
    timestamp: z.string().describe("ISO timestamp when the memory was created"),
    original_query: z.string().describe("The original user query/input")
  })
});

type GeneratedMemory = z.infer<typeof memorySchema>;

interface MemoryStructure {
  memory_structure: Record<string, {
    description: string;
    subcategories: Record<string, {
      description: string;
    }>;
  }>;
}

const memoryStructure: MemoryStructure = JSON.parse(
  readFileSync(join(__dirname, "memory-structure.json"), "utf-8")
);

async function generateMemory(userQuery: string): Promise<GeneratedMemory> {
  const structureContext = JSON.stringify(memoryStructure, null, 2);
  
  const structuredLlm = llm.withStructuredOutput(memorySchema);
  
  const prompt = `Based on the following memory structure and user query, generate a structured memory entry.

Memory Structure:
${structureContext}

User Query: "${userQuery}"

Please:
1. Analyze the query and determine the most appropriate category and subcategory from the memory structure
2. Rephrase/enhance the content to be more descriptive and searchable
3. Fill in all required fields including metadata`;

  const generatedMemory = await structuredLlm.invoke(prompt);
  
  return {
    ...generatedMemory,
    metadata: {
      ...generatedMemory.metadata,
      timestamp: new Date().toISOString(),
      original_query: userQuery
    }
  };
}

async function storeMemory(memory: GeneratedMemory): Promise<void> {
  const searchableText = `${memory.category} ${memory.subcategory} ${memory.content}`;
  
  await vectorStore.addDocuments([{
    pageContent: searchableText,
    metadata: {
      category: memory.category,
      subcategory: memory.subcategory,
      content: memory.content,
      timestamp: memory.metadata.timestamp,
      original_query: memory.metadata.original_query
    }
  }]);
  
  console.log(`Memory stored: ${memory.category}/${memory.subcategory}`);
}

async function processMemoryQuery(userQuery: string): Promise<void> {
  try {
    console.log(`Processing query: ${userQuery}`);
    
    const memory = await generateMemory(userQuery);
    console.log('Generated memory:', memory);
    
    await storeMemory(memory);
    console.log('Memory successfully stored in vector store');
    
  } catch (error) {
    console.error('Error processing memory query:', error);
  }
}

const query = "I learned TypeScript today and built my first web application";

processMemoryQuery(query).then(() => {
  console.log('Memory processing complete');
}).catch(console.error);
