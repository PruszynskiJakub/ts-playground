import {randomUUID} from 'crypto';
import type { Document } from './types';

// Factory function that takes environment variables and returns pure functions
export const createWebService = (env: { SERPER_API_KEY: string }) => {

    // Helper function to scrape a single webpage
    const scrapeSingleWebpage = async (url: string): Promise<Document> => {
        try {
            const headers = new Headers();
            headers.append("X-API-KEY", env.SERPER_API_KEY);
            headers.append("Content-Type", "application/json");

            const requestOptions = {
                method: "POST",
                headers,
                body: JSON.stringify({ url, "includeMarkdown": true }),
                redirect: "follow" as RequestRedirect,
            };

            const response = await fetch("https://scrape.serper.dev", requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            
            return {
                uuid: randomUUID(),
                text,
                metadata: {
                    source: url,
                },
            };
        } catch (error) {
            console.error(`Error scraping webpage ${url}:`, error);
            throw error;
        }
    };

    // Function to scrape multiple webpages in parallel
    const scrapeWebpage = async (urls: string[]): Promise<Document[]> => {
        try {
            const scrapePromises = urls.map(url => scrapeSingleWebpage(url));
            return await Promise.all(scrapePromises);
        } catch (error) {
            console.error("Error scraping webpages:", error);
            throw error;
        }
    };

    return {
        scrapeWebpage,
    };
};