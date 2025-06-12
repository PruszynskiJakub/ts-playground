// Factory function that creates document processing functions
export const createDocumentService = () => {
    
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

    // Function to restore content from placeholders
    const restoreContent = (processedText: string, images: string[], urls: string[]) => {
        let restoredContent = processedText;

        // Restore image placeholders
        images.forEach((imageUrl, index) => {
            const placeholder = `[IMAGE_PLACEHOLDER_${index}]`;
            restoredContent = restoredContent.replace(placeholder, `<img src="${imageUrl}" />`);
        });

        // Restore URL placeholders
        urls.forEach((url, index) => {
            const placeholder = `[URL_PLACEHOLDER_${index}]`;
            restoredContent = restoredContent.replace(placeholder, `<a href="${url}">`);
        });

        return restoredContent;
    };

    return {
        processContent,
        restoreContent
    };
};
