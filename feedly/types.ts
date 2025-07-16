export interface Document {
    text: string;
    metadata: {
        uuid: string;
        name: string;
        author?: string;
        source?: string;
        description?: string;
    };
}