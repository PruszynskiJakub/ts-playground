export interface Document {
  content: string;
  metadata: {
    tokens: number;
    source?: string; // url / path
    mimeType?: string; // mime type
    name?: string; // filename
    source_uuid?: string;
    conversation_uuid?: string;
    uuid?: string;
    duration?: number; // duration in seconds
    urls?: string[];
    images?: string[];
    screenshots?: string[];
    chunk_index?: number;
    total_chunks?: number;
  };
}