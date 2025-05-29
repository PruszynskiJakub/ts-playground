import {env} from 'bun';
import {QdrantClient} from "@qdrant/js-client-rest";

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

