import { createWebService } from "./web.service";
import { createOpenAIService } from "./openai.service";
import OpenAI from "openai";

// Function to extract and replace content with placeholders
const processContent = (content: string) => {
    const images: string[] = [];
    const urls: string[] = [];
    let processedText = content;

    // Extract and replace image URLs (img src, background-image, etc.)
    const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>|background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
    let imageMatch;
    let imageIndex = 0;
    while ((imageMatch = imageRegex.exec(content)) !== null) {
        const imageUrl = imageMatch[1] || imageMatch[2];
        if (imageUrl) {
            images.push(imageUrl);
            processedText = processedText.replace(imageMatch[0], `[IMAGE_PLACEHOLDER_${imageIndex}]`);
            imageIndex++;
        }
    }

    // Extract and replace URLs (href links)
    const urlRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let urlMatch;
    let urlIndex = 0;
    while ((urlMatch = urlRegex.exec(content)) !== null) {
        const url = urlMatch[1];
        if (url && !url.startsWith('#') && !url.startsWith('mailto:')) {
            urls.push(url);
            processedText = processedText.replace(urlMatch[0], `[URL_PLACEHOLDER_${urlIndex}]`);
            urlIndex++;
        }
    }

    // Clean up HTML tags to get plain text
    const textContent = processedText
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return {
        text: textContent,
        images,
        urls
    };
};

// Main function
(async () => {
    // Get URL from command line arguments
    const url = process.argv[2];
    
    if (!url) {
        console.error("Please provide a URL as an argument");
        console.error("Usage: npm run dev <URL>");
        process.exit(1);
    }

    const serperApiKey = process.env.SERPER_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!serperApiKey) {
        console.error("SERPER_API_KEY environment variable is required");
        process.exit(1);
    }

    if (!openaiApiKey) {
        console.error("OPENAI_API_KEY environment variable is required");
        process.exit(1);
    }

    const webService = createWebService(serperApiKey);
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });
    const openaiService = createOpenAIService(openaiClient);

    try {
        console.log(`Scraping webpage: ${url}`);
        const scrapeResults = await webService.scrapeWebpage(url);
        
        if (!scrapeResults || !scrapeResults.text) {
            console.error("Failed to scrape webpage or no content found");
            process.exit(1);
        }

        console.log("Processing content...");
        const processedContent = processContent(scrapeResults.text);
        
        console.log(`Extracted ${processedContent.images.length} images and ${processedContent.urls.length} URLs`);
        
        if (processedContent.text.length < 50) {
            console.log("Not enough text content to generate ideas");
            console.log("Ideas: []");
            return;
        }

        console.log("Generating creative ideas...");
        const completion = await openaiService.chatCompletion([
            {
                role: "system", 
                content: "You are a creative thinking assistant. Based on the provided text content, generate exactly 5 unique and creative ideas that are worth writing about or thinking deeply about. Each idea should be thought-provoking and original. If the content doesn't provide enough substance for creative ideas, return an empty response. Format your response as a simple numbered list (1. 2. 3. 4. 5.) with each idea on a new line."
            },
            {
                role: "user", 
                content: `Based on this content, generate 5 creative ideas worth exploring:\n\n${processedContent.text.substring(0, 4000)}`
            }
        ]) as OpenAI.Chat.Completions.ChatCompletion;

        const ideasText = completion.choices[0]?.message?.content || "";
        
        // Parse ideas from the response
        const ideas = ideasText
            .split('\n')
            .filter(line => line.trim().match(/^\d+\./))
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(idea => idea.length > 0);

        console.log("\n=== Results ===");
        console.log("Original URL:", url);
        console.log("Images found:", processedContent.images.length);
        console.log("URLs found:", processedContent.urls.length);
        console.log("Text length:", processedContent.text.length, "characters");
        console.log("\nCreative Ideas:");
        
        if (ideas.length === 0) {
            console.log("[]");
        } else {
            ideas.forEach((idea, index) => {
                console.log(`${index + 1}. ${idea}`);
            });
        }

    } catch (error) {
        console.error("Error in processing:", error);
        process.exit(1);
    }
})();
