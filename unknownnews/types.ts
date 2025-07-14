export interface Document {
    uuid: string;
    text: string;
    metadata: {
        source: string;
    };
}