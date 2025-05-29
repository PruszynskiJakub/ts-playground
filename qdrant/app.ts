import { env } from 'bun';
import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY
});

try {
    const result = await client.getCollections();
    console.log('List of collections:', result.collections);
} catch (err) {
    console.error('Could not get collections:', err);
}