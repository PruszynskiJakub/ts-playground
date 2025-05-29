import {encureColllection, addPoints, performSearch} from "./vector.store";
import {v4 as uuidv4} from "uuid";

const COLLECTION_NAME = "simple_rag";

// Sample data about AI concepts
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

async function main() {
    try {
        // Ensure collection exists
        console.log(`Ensuring collection '${COLLECTION_NAME}' exists...`);
        await encureColllection(COLLECTION_NAME);

        // Store data in vector database
        console.log(`Preparing to store ${data.length} items in vector database...`);
        try {
            const mappedData = data.map((text, index) => ({
                id: uuidv4(),
                text,
                metadata: {source: "AI concepts dataset"}
            }));

            await addPoints(COLLECTION_NAME, mappedData);
            console.log("Data storage process completed!");
        } catch (error) {
            console.error("Failed to store data:", error);
            // Continue with the search even if storage failed
        }

        // Search for "Transformer model"
        console.log("\nSearching for 'Transformer model'...");
        const searchQuery = "Transformer model";
        const results = await performSearch(COLLECTION_NAME, searchQuery);

        // Display results
        console.log(`\nTop ${results.length} results for "${searchQuery}":`);
        results.forEach((result, index) => {
            console.log(`\n${index + 1}. Score: ${result.score.toFixed(4)}`);
            console.log(`   ${result.payload}`);
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

// Run the main function
main();
