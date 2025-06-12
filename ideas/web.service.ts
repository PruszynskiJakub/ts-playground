// Factory function that creates web service functions
const createWebService = (apiKey: string) => {
    
    // Helper function to create headers
    const createHeaders = () => {
        const headers = new Headers();
        headers.append("X-API-KEY", apiKey);
        headers.append("Content-Type", "application/json");
        return headers;
    };

    // Helper function to make API requests
    const makeRequest = async (url: string, body: any) => {
        const requestOptions = {
            method: "POST",
            headers: createHeaders(),
            body: JSON.stringify(body),
            redirect: "follow" as RequestRedirect,
        };

        try {
            const response = await fetch(url, requestOptions);
            const result = await response.text();
            return JSON.parse(result);
        } catch (error) {
            console.error(`Request failed for ${url}:`, error);
            throw error;
        }
    };

    // Function to scrape a webpage
    const scrapeWebpage = async (url: string) => {
        return makeRequest("https://scrape.serper.dev", { url });
    };

    // Function to perform web search
    const webSearch = async (query: string) => {
        return makeRequest("https://google.serper.dev/search", { q: query });
    };

    // Function to search and scrape - combines both operations
    const searchAndScrape = async (query: string) => {
        const searchResults = await webSearch(query);
        
        // Extract URLs from search results (assuming they're in organic results)
        const urls = searchResults.organic?.slice(0, 3).map((result: any) => result.link) || [];
        
        // Scrape the first few URLs
        const scrapePromises = urls.map((url: string) => 
            scrapeWebpage(url).catch(error => ({ error: error.message, url }))
        );
        
        const scrapeResults = await Promise.all(scrapePromises);
        
        return {
            searchResults,
            scrapeResults
        };
    };

    return {
        scrapeWebpage,
        webSearch,
        searchAndScrape,
    };
};

export { createWebService };
