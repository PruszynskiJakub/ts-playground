import {encureColllection} from "./vectore.store.ts";

const COLLECTION_NAME = "simple_rag"

const data: string[] = [
  "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans.",
  "Machine learning is a subset of AI that focuses on the development of algorithms that can learn from and make predictions based on data.",
  "Natural Language Processing (NLP) enables computers to understand, interpret, and generate human language in a valuable way.",
  "Vector databases are specialized database systems designed to store and search high-dimensional vectors efficiently.",
  "Retrieval-Augmented Generation (RAG) combines retrieval-based and generation-based approaches to improve the quality and factuality of AI-generated content.",
  "Embeddings are numerical representations of text that capture semantic meaning, allowing machines to understand relationships between words and concepts.",
  "Transformer models like BERT and GPT have revolutionized NLP by using attention mechanisms to process text in parallel rather than sequentially.",
  "Semantic search goes beyond keyword matching to understand the intent and contextual meaning of search queries.",
  "Knowledge graphs represent information as a network of entities and their relationships, providing structured context for AI systems.",
  "Prompt engineering is the practice of designing effective inputs for large language models to elicit desired outputs or behaviors."
];

await encureColllection(COLLECTION_NAME)
