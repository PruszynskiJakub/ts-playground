import OpenAI from 'openai';
import type {ChatCompletionMessageParam} from 'openai/resources/chat/completions';
import {env} from "bun";
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings';

const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY
});

/**
 * Creates a chat completion using the OpenAI API
 * @param model The model to use (defaults to gpt-4.1)
 * @param systemMessage Optional system message to set context
 * @param messages Array of user/assistant messages
 * @param temperature Controls randomness (0-2, defaults to 1)
 * @returns The completion content as a string
 */
/**
 * Creates an embedding using the OpenAI API
 * @param text The text to create an embedding for
 * @param model The model to use (defaults to text-embedding-3-large)
 * @returns The embedding as an array of numbers
 */
export async function embedding(
    text: string,
    model: string = 'text-embedding-3-large'
): Promise<number[]> {
    try {
        const response: CreateEmbeddingResponse = await client.embeddings.create({
            model: "text-embedding-3-large",
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error("Error creating embedding:", error);
        throw error;
    }
}

export async function completion(
    {
        model = 'gpt-4.1',
        systemMessage,
        messages,
        temperature = 1
    }: {
        model?: string;
        systemMessage?: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        temperature?: number;
    }
): Promise<string> {
    // Prepare messages array with optional system message
    const formattedMessages: ChatCompletionMessageParam[] = [];

    if (systemMessage) {
        formattedMessages.push({role: 'system', content: systemMessage});
    }

    // Add the rest of the messages
    formattedMessages.push(...messages as ChatCompletionMessageParam[]);

    const completion = await client.chat.completions.create({
        model,
        messages: formattedMessages,
        temperature,
    });

    return completion.choices[0].message.content || '';
}

