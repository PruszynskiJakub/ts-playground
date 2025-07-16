import type { Document } from './types.ts';
import {randomUUID} from "crypto";


// Factory function that takes an OpenAI service and returns document processing functions
export const createDocumentService = (openAiService: any) => {

  // Function to summarize an array of documents and return a single summary document
  const summarize = async (documents: Document[]): Promise<Document> => {
    const combinedContent = documents
      .map((doc, index) => `Document ${index + 1}:\n${doc.text}`)
      .join('\n\n---\n\n');

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant that creates concise summaries of multiple documents. Combine the key information from all documents into a coherent summary.'
      },
      {
        role: 'user' as const,
        content: `Please summarize the following documents:\n\n${combinedContent}`
      }
    ];

    const response = await openAiService.chatCompletion(messages);
    const summaryContent = response.choices[0].message.content;

    return {
      text: summaryContent,
      metadata: {
        uuid: randomUUID(),
        name: "Summary",
        description: `It's a generated summary of ${documents
            .map((doc) => doc.metadata.name + "(" + doc.metadata.uuid + ")")
            .join(", ")}.`
      }
    };
  };

  return {
    summarize,
  };
};