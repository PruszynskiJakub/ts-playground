export interface Document {
    text: string;
    metadata: {
        uuid: string;
        name: string;
        author?: string;
        source?: string;
        description?: string;
        chunk: number,
        total_chunks: number;
        urls?: string[];
        images?: string[];
    };
}