import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import {QdrantVectorStore} from "@langchain/qdrant";
import {readFileSync} from "fs";
import {join} from "path";
import {z} from "zod";

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
  name: z.string().describe("File-name-optimized, concise title similar to personal note names"),
  content: z.object({
    text: z.string().describe("Well-formatted markdown text in first-person POV, detailed but natural")
  }),
  category: z.string().describe("Main category from memory structure ONLY"),
  subcategory: z.string().describe("Specific subcategory from memory structure ONLY"),
  metadata: z.object({
    timestamp: z.string().describe("ISO timestamp when memory was created"),
    original_query: z.string().describe("Original user query/input"),
    confidence: z.number().min(1).max(100).describe("Assistant's certainty level (1-100)"),
    urls: z.array(z.string()).describe("URLs mentioned in user message"),
    tags: z.array(z.string()).describe("Relevant, specific tags (names, entities, unique topics)")
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
  
  const prompt = `You are a memory assistant that creates structured memory entries. Follow these rules STRICTLY:

RULES:
- Categories and Subcategories: ALWAYS use categories and subcategories EXCLUSIVELY from the provided memory structure. NEVER create new ones.
- Memory Consolidation: COMBINE related information about the same subject into a SINGLE memory object when appropriate.
- Name Field: GENERATE a file-name-optimized, concise title similar to personal note names (for profiles: person name, for work: project name, for resources: thing name).
- Content: WRITE 'content.text' in first-person POV, well-formatted markdown, detailed but natural. EXCLUDE URLs from content.text.
- Metadata: SET 'confidence' (1-100), EXTRACT 'urls' from user message, IDENTIFY specific 'tags' (avoid generic tags).

Memory Structure:
${structureContext}

EXAMPLES:

User Query: "I met Sarah Johnson at the tech conference yesterday. She's a senior developer at Google and we talked about React performance optimization. Her email is sarah.j@google.com"
Expected Output:
- name: "Sarah Johnson"
- content.text: "# Sarah Johnson\\n\\n**Position:** Senior Developer at Google\\n\\n## Meeting Context\\nMet at a tech conference where we had an engaging discussion about React performance optimization techniques. She shared insights from her experience working on large-scale applications at Google.\\n\\n**Contact:** sarah.j@google.com"
- category: "professional"
- subcategory: "networking"
- confidence: 95
- urls: []
- tags: ["Sarah Johnson", "Google", "React", "performance optimization", "tech conference"]

User Query: "I just finished reading 'Atomic Habits' by James Clear. The book taught me about habit stacking and the 1% improvement principle. Really helpful for building better routines."
Expected Output:
- name: "Atomic Habits"
- content.text: "# Atomic Habits by James Clear\\n\\n## Key Concepts Learned\\n\\n### Habit Stacking\\nA powerful technique for building new habits by linking them to existing ones.\\n\\n### 1% Improvement Principle\\nThe idea that small, consistent improvements compound over time to create significant results.\\n\\n## Personal Impact\\nThe book provided practical strategies for building better daily routines and breaking bad habits."
- category: "educational"
- subcategory: "self_learning"
- confidence: 90
- urls: []
- tags: ["Atomic Habits", "James Clear", "habit stacking", "1% improvement", "self-improvement", "routines"]

Now generate a structured memory entry for this user query: "${userQuery}"`;

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
  const searchableText = `${memory.name} ${memory.category} ${memory.subcategory} ${memory.content.text} ${memory.metadata.tags.join(' ')}`;
  
  await vectorStore.addDocuments([{
    pageContent: searchableText,
    metadata: {
      name: memory.name,
      category: memory.category,
      subcategory: memory.subcategory,
      content: memory.content.text,
      timestamp: memory.metadata.timestamp,
      original_query: memory.metadata.original_query,
      confidence: memory.metadata.confidence,
      urls: memory.metadata.urls,
      tags: memory.metadata.tags
    }
  }]);
  
  console.log(`Memory stored: ${memory.name} (${memory.category}/${memory.subcategory})`);
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
