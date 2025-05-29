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
  
  // Process all patterns in a single pass for better performance
  const processedText = markdownText
    // Process markdown image syntax first: ![alt text](image-url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imageUrl) => {
      images.push(imageUrl);
      return `![${alt}]({{$img${imageIndex++}}})`;
    })
    // Then process markdown link syntax: [link text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      // Skip if it's one of our image placeholders
      if (url.includes('{{$img')) {
        return match;
      }
      urls.push(url);
      return `[${text}]({{$url${urlIndex++}}})`;
    })
    // Finally process plain URLs that aren't in markdown syntax
    .replace(
      /(?<![(\[])(https?:\/\/[^\s<>"']+)(?![^<>]*>|[^"']*['"]\))/g, 
      (match, url) => {
        urls.push(url);
        return `{{$url${urlIndex++}}}`;
      }
    );
  
  return {
    content: processedText,
    images,
    urls
  };
}
