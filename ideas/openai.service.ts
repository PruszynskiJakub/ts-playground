import OpenAI from "openai";

// Factory function that takes an OpenAI client and returns pure functions
const createOpenAIService = (client: OpenAI) => {

    // Function to generate a chat completion given messages
    const chatCompletion = async (messages: Array<{
        role: "system" | "user" | "assistant" | "tool";
        content: string;
    }>) => {
        const completion = await client.chat.completions.create({
            model: "gpt-4o",
            messages,
        });
        return completion.choices[0].message.content;
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

    // Use chatCompletion function
    const chatResult = await openAIService.chatCompletion([
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Explain functional programming in TypeScript." },
    ]);
    console.log("Chat Completion:", chatResult);

    // Use generateResponse function
    const response = await openAIService.generateResponse(
        "You are a coding assistant that talks like a pirate",
        "Are semicolons optional in JavaScript?"
    );
    console.log("Response API:", response);
})();
