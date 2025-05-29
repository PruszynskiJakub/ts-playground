import {env} from 'bun';
import {QdrantClient} from '@qdrant/js-client-rest';
import {createEmbedding} from './ai.service';
import {v4 as uuidv4} from 'uuid';

const client = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY
});

export async function ensureCollection(name: string) {
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
    const pointsToUpsert = await Promise.all(points.map(async point => {
        const embedding = await createEmbedding(point.text);

        return {
            id: point.id || uuidv4(),
            vector: embedding,
            payload: {
                text: point.text,
                ...point.metadata
            }
        };
    }));

    // const pointsFilePath = path.join(__dirname, 'points.json');
    // await fs.writeFile(pointsFilePath, JSON.stringify(pointsToUpsert, null, 2));

    await client.upsert(collectionName, {
        wait: true,
        points: pointsToUpsert
    });
}

/**
 * Search for similar points in a collection
 * @param collectionName The name of the collection
 * @param query The search query text
 * @param limit Maximum number of results to return
 * @returns Array of search results with text and score
 */
export async function performSearch(collectionName: string, query: string, limit: number = 5) {
    const queryEmbedding = await createEmbedding(query);
    return client.search(collectionName, {
        vector: queryEmbedding,
        limit,
        with_payload: true
    });
}

