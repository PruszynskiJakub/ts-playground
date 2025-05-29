import {env} from 'bun';
import {QdrantClient} from "@qdrant/js-client-rest";
import {embedding} from './ai.service';
import { v4 as uuidv4 } from 'uuid';

const client = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY
});

export async function encureColllection(name: string) {
    try {
        const collections = await client.getCollections();
        if (!collections.collections.some(c => c.name === name)) {
            await client.createCollection(name, {
                vectors: {size: 3072, distance: "Cosine"}
            });
            console.log(`Collection '${name}' created successfully.`);
        } else {
            console.log(`Collection '${name}' already exists.`);
        }
    } catch (error) {
        console.error(`Error ensuring collection '${name}':`, error);
        throw error;
    }
}

export async function printCollections() {
    try {
        const result = await client.getCollections();
        console.log('List of collections:', result.collections);
    } catch (err) {
        console.error('Could not get collections:', err);
    }
}

/**
 * Adds points to a Qdrant collection
 * @param collectionName The name of the collection to add points to
 * @param points Array of objects containing text and optional metadata
 * @returns Result of the upsert operation
 */
export async function addPoints(
    collectionName: string,
    points: Array<{
        id?: string,
        text: string,
        metadata?: Record<string, any>
    }>
) {
    try {
        // Create points with embeddings
        console.log(`Generating embeddings for ${points.length} points...`);
        const pointsWithEmbeddings = await Promise.all(
            points.map(async (point, index) => {
                const vector = await embedding(point.text);
                return {
                    id: point.id || uuidv4(),
                    vector,
                    payload: {
                        text: point.text,
                        ...(point.metadata || {})
                    }
                };
            })
        );
        
        // Process points in smaller batches to avoid errors
        const batchSize = 3;
        console.log(`Uploading points in batches of ${batchSize}...`);
        
        for (let i = 0; i < pointsWithEmbeddings.length; i += batchSize) {
            const batch = pointsWithEmbeddings.slice(i, i + batchSize);
            console.log(`Uploading batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pointsWithEmbeddings.length/batchSize)}...`);
            
            try {
                await client.upsert(collectionName, {
                    points: batch
                });
            } catch (batchError) {
                console.error(`Error uploading batch ${Math.floor(i/batchSize) + 1}:`, batchError.message);
                // Continue with next batch instead of failing completely
            }
        }
        
        console.log("Finished uploading points.");
        return { status: "success" };
    } catch (error) {
        console.error("Error in addPoints:", error.message);
        throw error;
    }
}

/**
 * Search for similar points in a collection
 * @param collectionName The name of the collection
 * @param query The search query text
 * @param limit Maximum number of results to return
 * @returns Array of search results with text and score
 */
export async function searchByText(
    collectionName: string,
    query: string,
    limit: number = 3
) {
    try {
        console.log(`Generating embedding for query: "${query}"...`);
        const queryVector = await embedding(query);
        
        console.log(`Searching collection "${collectionName}" for similar vectors...`);
        const results = await client.search(collectionName, {
            vector: queryVector,
            limit,
            with_payload: true
        });
        
        if (results.length === 0) {
            console.log("No results found.");
        } else {
            console.log(`Found ${results.length} results.`);
        }
        
        // Format and return results
        return results.map(result => ({
            id: result.id,
            text: result.payload?.text as string,
            score: result.score
        }));
    } catch (error) {
        console.error("Error searching points:", error.message);
        console.log("Make sure the collection exists and contains points.");
        return [];
    }
}

