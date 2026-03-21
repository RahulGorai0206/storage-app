import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import type { ChunkInfo } from '../types';

// 25 MB chunk size in bytes (matches 7-Zip split convention)
export const CHUNK_SIZE = 25 * 1024 * 1024; // 26,214,400 bytes

/**
 * Determine if a file needs chunking based on the 25 MB threshold.
 */
export function needsChunking(filePath: string): boolean {
  const stats = fs.statSync(filePath);
  return stats.size > CHUNK_SIZE;
}

/**
 * Calculate chunk boundaries for a file.
 * Pure binary split compatible with 7-Zip's .001/.002 format.
 */
export function calculateChunks(filePath: string): ChunkInfo[] {
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const baseName = path.basename(filePath);
  const numChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const chunks: ChunkInfo[] = [];

  for (let i = 0; i < numChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const ext = String(i + 1).padStart(3, '0');
    chunks.push({
      index: i,
      start,
      end,
      size: end - start,
      fileName: `${baseName}.${ext}`,
    });
  }

  return chunks;
}

/**
 * Read a specific chunk from a file as a Buffer.
 * Uses createReadStream for memory efficiency.
 */
export function readChunk(filePath: string, chunk: ChunkInfo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const stream = fs.createReadStream(filePath, {
      start: chunk.start,
      end: chunk.end - 1, // end is inclusive in createReadStream
      highWaterMark: 128 * 1024, // 128 KB buffer
    });

    stream.on('data', (data: Buffer | string) => {
      if (typeof data === 'string') {
        buffers.push(Buffer.from(data));
      } else {
        buffers.push(data);
      }
    });
    stream.on('end', () => resolve(Buffer.concat(buffers)));
    stream.on('error', reject);
  });
}

/**
 * Read a chunk and return as Base64 string (required by GitHub Git Blobs API).
 */
export async function readChunkAsBase64(filePath: string, chunk: ChunkInfo): Promise<string> {
  const buffer = await readChunk(filePath, chunk);
  return buffer.toString('base64');
}

/**
 * Compute SHA-256 hash for a file or a specific byte range.
 */
export function computeSHA256(filePath: string, start?: number, end?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const options: { start?: number; end?: number; highWaterMark?: number } = {
      highWaterMark: 128 * 1024,
    };
    if (start !== undefined) options.start = start;
    if (end !== undefined) options.end = end - 1; // inclusive

    const stream = fs.createReadStream(filePath, options);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Compute SHA-256 hash from a Buffer.
 */
export function computeSHA256FromBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Get MIME type from file extension.
 */
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    // Video
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    // Text
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.md': 'text/markdown',
  };
  return mimeMap[ext] || 'application/octet-stream';
}
