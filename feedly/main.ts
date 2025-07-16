import OpenAI from "openai";
import { createWebService } from "./web.service";
import { createOpenAIService } from "./openai.service";
import { createDocumentService } from "./document.service";

// Get URL from command line arguments
const url = process.argv[2];

if (!url) {
    console.error("Usage: bun run feedly <url>");
    process.exit(1);
}

// Validate URL format
try {
    new URL(url);
} catch (error) {
    console.error("Invalid URL provided:", url);
    process.exit(1);
}

// Check for required environment variables
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SERPER_API_KEY) {
    console.error("SERPER_API_KEY environment variable is required");
    process.exit(1);
}

if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY environment variable is required");
    process.exit(1);
}

async function main() {
    try {
        console.log(`Scraping webpage: ${url}`);
        
        // Initialize services
        const webService = createWebService({ SERPER_API_KEY: SERPER_API_KEY as string });
        const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
        const openaiService = createOpenAIService(openaiClient);
        const documentService = createDocumentService(openaiService);

        // Scrape the webpage
        const documents = await webService.scrapeWebpage([url]);
        
        if (documents.length === 0) {
            console.error("Failed to scrape webpage");
            process.exit(1);
        }

        console.log(" Webpage scraped successfully");
        
        // Summarize the content
        console.log("Generating summary...");
        
        const summaryDocument = await documentService.summarize(documents);
        const summary = summaryDocument.text;
        
        console.log(" Summary generated\n");
        
        // Display results
        console.log("=" .repeat(80));
        console.log(`URL: ${url}`);
        console.log("=" .repeat(80));
        console.log("\nSUMMARY:");
        console.log("-".repeat(40));
        console.log(summary);
        console.log("-".repeat(40));
        
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();