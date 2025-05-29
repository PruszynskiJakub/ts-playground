import {env} from 'bun';
import {QdrantClient} from "@qdrant/js-client-rest";
import {embedding} from './ai.service';
import { v4 as uuidv4 } from 'uuid';

const client = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY
});

export async function encureColllection(name: string) {
    const collections = await client.getCollections();
    if (!collections.collections.some(c => c.name === name)) {
        await client.createCollection(name, {
            vectors: {size: 3072, distance: "Cosine"}
        });
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
        // Ensure the collection exists
        await encureColllection(collectionName);
        
        // Create points with embeddings
        const pointsWithEmbeddings = await Promise.all(
            points.map(async (point, index) => {
                const vector = await embedding(point.text);
                return {
                    id: point.id || uuidv4(),
                    vector,
                    payload: {
                        text: point.text,
                        ...point.metadata
                    }
                };
            })
        );
        
        // Upsert points to the collection
        return await client.upsert(collectionName, {
            points: pointsWithEmbeddings
        });
    } catch (error) {
        console.error("Error adding points:", error);
        throw error;
    }
}

