import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';
import * as mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import type { Document } from './types';
import type { createTextService } from './text.service';
import type { createWebService } from './web.service';

interface FileResult {
  type: "audio" | "text" | "image" | "document";
  path: string;
  fileName: string;
  fileUUID: string;
  mimeType: string;
  source?: string;
}

interface MimeTypeConfig {
  mimes: string[];
  extensions: string[];
}

const mimeTypes: Record<string, MimeTypeConfig> = {
  audio: {
    mimes: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/flac'],
    extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a']
  },
  text: {
    mimes: ['text/plain', 'text/markdown', 'text/html', 'text/csv', 'application/json'],
    extensions: ['txt', 'md', 'html', 'csv', 'json']
  },
  image: {
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  },
  document: {
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['pdf', 'doc', 'docx']
  }
};

const getFileCategoryFromMimeType = (mimeType: string): "text" | "audio" | "image" | "document" => {
  for (const [category, typeInfo] of Object.entries(mimeTypes)) {
    if (typeInfo.mimes.includes(mimeType)) {
      return category as "text" | "audio" | "image" | "document";
    }
  }
  return "document";
};

export const createFileService = (textService?: ReturnType<typeof createTextService>, webService?: ReturnType<typeof createWebService>) => {
  const isUrl = (input: string): boolean => {
    try {
      const url = new URL(input);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const getMimeTypeFromBuffer = async (fileContent: Buffer, fileName: string): Promise<string> => {
    const detectedMime = mime.lookup(fileName);
    if (detectedMime) {
      return detectedMime;
    }
    
    const ext = extname(fileName).slice(1).toLowerCase();
    for (const [type, config] of Object.entries(mimeTypes)) {
      if (config.extensions.includes(ext)) {
        return config.mimes[0];
      }
    }
    
    return 'application/octet-stream';
  };

  const getDefaultExtension = (type: "audio" | "text" | "image" | "document"): string => {
    const defaultExtensions = {
      audio: 'mp3',
      text: 'txt',
      image: 'jpg',
      document: 'pdf'
    };
    return defaultExtensions[type];
  };

  const saveTempFile = async (fileContent: Buffer, fileName: string, fileUUID: string): Promise<string> => {
  const tempDir = join(process.cwd(), 'public', 'temp');
    await mkdir(tempDir, { recursive: true });
    
    const tempFilePath = join(tempDir, `${fileUUID}_${fileName}`);
    await writeFile(tempFilePath, fileContent);
    
    return tempFilePath;
  };

  const save = async (
    fileContent: Buffer,
    fileName: string,
    fileUUID: string,
    type: "audio" | "text" | "image" | "document",
    source?: string
  ): Promise<FileResult> => {
    try {
      const date = new Date();
      const datePath = `${date.getFullYear()}-${(
        date.getMonth() + 1
      ).toString().padStart(2, "0")}-${date
        .getDate()
        .toString()
        .padStart(2, "0")}`;
      const dirPath = join(
        process.cwd(),
        `public/storage/${type}/${datePath}/${fileUUID}`
      );
      await mkdir(dirPath, { recursive: true });

      const mimeType = await getMimeTypeFromBuffer(fileContent, fileName);
      const originalExt = extname(fileName).slice(1);
      const fileExt = originalExt || mime.extension(mimeType) || getDefaultExtension(type);

      if (!mimeTypes[type].mimes.includes(mimeType)) {
        throw new Error(
          `File MIME type ${mimeType} does not match expected type ${type}`
        );
      }

      const fileNameWithoutExt = basename(fileName, extname(fileName));
      const newFileName = `${fileNameWithoutExt}.${fileExt}`;
      const filePath = join(dirPath, newFileName);

      await writeFile(filePath, fileContent);

      const result: FileResult = {
        type,
        path: filePath,
        fileName: newFileName,
        mimeType,
        fileUUID,
        ...(source && { source }),
      };

      console.log("File saved to:", result);

      return result;
    } catch (error: any) {
      console.error(`Failed to save file: ${error.message}`);
      throw error;
    }
  };

  const processFile = async (filePathOrUrl: string, chunkSize?: number): Promise<{ docs: Document[] }> => {
    if (!textService) {
      throw new Error('Text service is required for processing files');
    }

    try {
      // Check if input is a URL
      if (isUrl(filePathOrUrl)) {
        // Handle URL scraping
        if (!webService) {
          throw new Error('Web service is required for processing URLs');
        }
        
        const scrapedDocs = await webService.scrapeWebpage([filePathOrUrl]);
        
        // Process each scraped document
        const allChunks: Document[] = [];
        for (const doc of scrapedDocs) {
          // Extract images and URLs from scraped content (treat as markdown/text)
          const extractedDoc = textService.extractImagesAndUrls(doc);
          
          // Split into chunks
          const chunks = await textService.split(extractedDoc, chunkSize);
          allChunks.push(...chunks);
        }
        
        return { docs: allChunks };
      }
      
      // Handle local file processing
      const fileContent = await readFile(filePathOrUrl, 'utf-8');
      const fileName = basename(filePathOrUrl);
      
      // Detect MIME type
      const mimeType = await getMimeTypeFromBuffer(Buffer.from(fileContent), fileName);
      
      // Determine if file is processable
      const isMarkdown = fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown');
      const isText = mimeTypes.text.mimes.includes(mimeType) || mimeTypes.text.extensions.includes(extname(fileName).slice(1).toLowerCase());
      
      if (!isMarkdown && !isText) {
        return { docs: [] };
      }

      // Create Document instance
      const document: Document = {
        text: fileContent,
        metadata: {
          uuid: uuidv4(),
          name: fileName,
          source: filePathOrUrl,
          chunk: 0,
          total_chunks: 1
        }
      };

      // Extract images and URLs for markdown files
      const extractedDoc = isMarkdown ? textService.extractImagesAndUrls(document) : document;
      
      // Split into chunks
      const chunks = await textService.split(extractedDoc, chunkSize);
      
      return { docs: chunks };
    } catch (error) {
      console.error('Error processing file or URL:', error);
      throw error;
    }
  };

  const uploadAndProcess = async (fileContent: Buffer, fileName: string, chunkSize?: number): Promise<{ docs: Document[], tempPath: string, savedFile: FileResult }> => {
    const fileUUID = uuidv4();
    const mimeType = await getMimeTypeFromBuffer(fileContent, fileName);
    const fileType = getFileCategoryFromMimeType(mimeType);
    
    const tempPath = await saveTempFile(fileContent, fileName, fileUUID);
    
    try {
      const savedFile = await save(fileContent, fileName, fileUUID, fileType);
      const { docs } = await processFile(tempPath, chunkSize);
      
      return { docs, tempPath, savedFile };
    } catch (error) {
      await unlink(tempPath).catch(() => {});
      throw error;
    }
  };

  const unlinkTempFile = async (tempPath: string): Promise<void> => {
    try {
      await unlink(tempPath);
    } catch (error) {
      console.error('Failed to unlink temp file:', error);
    }
  };

  return {
    save,
    process: processFile,
    uploadAndProcess,
    unlinkTempFile,
    getFileCategoryFromMimeType
  };
};