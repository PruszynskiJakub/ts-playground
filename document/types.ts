export interface Document {
  uuid: string;
  content: string;
  metadata: {
    tokens: number,
    source?: string;
    urls?: string[];
    images?: string[];
  };
}