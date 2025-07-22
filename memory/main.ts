import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import {QdrantVectorStore} from "@langchain/qdrant";
import {readFileSync} from "fs";
import {join} from "path";

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

interface MemoryStructure {
  memory_structure: Record<string, {
    description: string;
    subcategories: Record<string, {
      description: string;
    }>;
  }>;
}

interface GeneratedMemory {
  content: string;
  category: string;
  subcategory: string;
  metadata: {
    timestamp: string;
    original_query: string;
  };
}

const memoryStructure: MemoryStructure = JSON.parse(
  readFileSync(join(__dirname, "memory-structure.json"), "utf-8")
);

async function generateMemory(userQuery: string): Promise<GeneratedMemory> {
  const structureContext = JSON.stringify(memoryStructure, null, 2);
  
  const prompt = `Based on the following memory structure and user query, generate a structured memory entry.

Memory Structure:
${structureContext}

User Query: "${userQuery}"

Please:
1. Analyze the query and determine the most appropriate category and subcategory
2. Rephrase/enhance the content to be more descriptive and searchable
3. Return a JSON object with this structure:
{
  "content": "Enhanced/rephrased memory content",
  "category": "selected_category",
  "subcategory": "selected_subcategory",
  "metadata": {
    "timestamp": "current_iso_timestamp",
    "original_query": "original_user_query"
  }
}

Only return the JSON object, no additional text.`;

  const response = await llm.invoke(prompt);
  const generatedMemory = JSON.parse(response.content as string);
  
  return {
    ...generatedMemory,
    metadata: {
      ...generatedMemory.metadata,
      timestamp: new Date().toISOString()
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
