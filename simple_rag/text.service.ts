/**
 * Processes markdown text to extract images and URLs while preserving their placement
 * @param markdownText The markdown text to process
 * @returns Object containing processed content and arrays of extracted images and URLs
 */
export function processMarkdown(markdownText: string): {
  content: string;
  images: string[];
  urls: string[];
} {
  const images: string[] = [];
  const urls: string[] = [];
  let imageIndex = 0;
  let urlIndex = 0;
  
  // Process markdown image syntax: ![alt text](image-url)
  let processedText = markdownText.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imageUrl) => {
    images.push(imageUrl);
    return `![${alt}](IMAGE_${imageIndex++})`;
  });
  
  // Process markdown link syntax: [link text](url)
  processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    // Skip if it's one of our image placeholders
    if (url.startsWith('IMAGE_')) {
      return match;
    }
    urls.push(url);
    return `[${text}](URL_${urlIndex++})`;
  });
  
  // Process plain URLs that aren't in markdown syntax
  processedText = processedText.replace(
    /(https?:\/\/[^\s<>"']+)(?![^<>]*>|[^"']*['"]\))/g, 
    (match, url) => {
      urls.push(url);
      return `URL_${urlIndex++}`;
    }
  );
  
  return {
    content: processedText,
    images,
    urls
  };
}
