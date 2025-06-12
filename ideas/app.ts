import { createWebService } from "./web.service";

// Usage example
(async () => {
    const apiKey = process.env.SERPER_API_KEY;
    
    if (!apiKey) {
        console.error("SERPER_API_KEY environment variable is required");
        process.exit(1);
    }

    const webService = createWebService(apiKey);

    try {
        // Example 1: Web search
        console.log("=== Web Search Example ===");
        const searchResults = await webService.webSearch("apple inc");
        console.log("Search Results:", JSON.stringify(searchResults, null, 2));

        // Example 2: Scrape webpage
        console.log("\n=== Webpage Scraping Example ===");
        const scrapeResults = await webService.scrapeWebpage("https://www.apple.com");
        console.log("Scrape Results:", JSON.stringify(scrapeResults, null, 2));

        // Example 3: Combined search and scrape
        console.log("\n=== Combined Search and Scrape Example ===");
        const combinedResults = await webService.searchAndScrape("typescript functional programming");
        console.log("Combined Results:", JSON.stringify(combinedResults, null, 2));

    } catch (error) {
        console.error("Error in web service operations:", error);
    }
})();
