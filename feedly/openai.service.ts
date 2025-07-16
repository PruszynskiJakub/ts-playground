import OpenAI from "openai";
import type {
    ChatCompletion,
    ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

// Factory function that takes an OpenAI client and returns pure functions
export const createOpenAIService = (client: OpenAI) => {

    // Function to generate a chat completion given messages
    const chatCompletion = async (
        messages: ChatCompletionMessageParam[],
        options?: { stream?: boolean; temperature?: number, model?: string, jsonMode?: boolean }
    ): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> => {
        try {
            const chatCompletion = await client.chat.completions.create({
                model: options?.model ?? "gpt-4o",
                messages,
                stream: options?.stream ?? false,
                temperature: options?.temperature ?? 1.3,
                ...(options?.jsonMode && { response_format: { type: "json_object" } }),
            });

            return options?.stream
                ? chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
                : chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
        } catch (error) {
            console.error("Error in OpenAI completion:", error);
            throw error;
        }
    };

    // Function to generate a text response with instructions and input
    const generateResponse = async (instructions: string, input: string) => {
        const response = await client.responses.create({
            model: "gpt-4o",
            instructions,
            input,
        });
        return response.output_text;
    };

    return {
        chatCompletion,
        generateResponse,
    };
};