import OpenAI from "openai";
import type {
    ChatCompletion,
    ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

// Factory function that takes an OpenAI client and returns pure functions
const createOpenAIService = (client: OpenAI) => {

    // Function to generate a chat completion given messages
    const chatCompletion = async (
        messages: ChatCompletionMessageParam[],
        options?: { stream?: boolean }
    ): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> => {
        try {
            const chatCompletion = await client.chat.completions.create({
                model: "gpt-4o",
                messages,
                stream: options?.stream ?? false,
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

// Usage example
(async () => {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const openAIService = createOpenAIService(client);

    // Use chatCompletion function (non-streaming)
    const chatResult = await openAIService.chatCompletion([
        {role: "system", content: "You are a helpful assistant."},
        {role: "user", content: "Explain functional programming in TypeScript."},
    ]);
    console.log("Chat Completion:", chatResult);

    // Use chatCompletion function (streaming)
    console.log("\n=== Streaming Chat Completion ===");
    const completion = await openAIService.chatCompletion([
        {role: "system", content: "You are a helpful assistant."},
        {role: "user", content: "Tell me a short story about a robot."},
    ], {stream: false}) as ChatCompletion

    console.log("\n=== Streaming Chat Completion ===");
    console.log(completion.choices[0].message)

    // Use generateResponse function
    const response = await openAIService.generateResponse(
        "You are a coding assistant that talks like a pirate",
        "Are semicolons optional in JavaScript?"
    );
    console.log("Response API:", response);
})();
