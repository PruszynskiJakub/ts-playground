// Factory function that takes environment variables and returns pure functions
export const createWebService = (env: { SERPER_API_KEY: string }) => {

    // Function to scrape a webpage using Serper API
    const scrapeWebpage = async (url: string): Promise<string> => {
        try {
            const headers = new Headers();
            headers.append("X-API-KEY", env.SERPER_API_KEY);
            headers.append("Content-Type", "application/json");

            const requestOptions = {
                method: "POST",
                headers,
                body: JSON.stringify({ url }),
                redirect: "follow" as RequestRedirect,
            };

            const response = await fetch("https://scrape.serper.dev", requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.text();
            return result;
        } catch (error) {
            console.error("Error scraping webpage:", error);
            throw error;
        }
    };

    return {
        scrapeWebpage,
    };
};