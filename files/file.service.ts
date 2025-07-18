import { mkdir, writeFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import * as mime from 'mime-types';

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

export const createFileService = () => {
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
        __dirname,
        `storage/${type}/${datePath}/${fileUUID}`
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

  return {
    save
  };
};