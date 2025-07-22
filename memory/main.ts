import {ChatOpenAI, OpenAIEmbeddings} from "@langchain/openai";
import {QdrantVectorStore} from "@langchain/qdrant";

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
    collectionName: "memory",
});


