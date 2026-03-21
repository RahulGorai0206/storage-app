import { PassThrough } from 'stream';
import http from 'http';
import { getChunks, getNode } from './database';
import { CHUNK_SIZE } from './chunker';
import type { PhysicalChunk, VirtualNode } from '../types';

let streamServer: http.Server | null = null;
let serverPort: number = 0;

/**
 * Start the local streaming proxy server.
 * Returns the port number.
 */
export function startStreamServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    streamServer = http.createServer(async (req, res) => {
      try {
        await handleStreamRequest(req, res);
      } catch (err) {
        console.error('Stream error:', err);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    streamServer.listen(0, '127.0.0.1', () => {
      const addr = streamServer!.address();
      if (addr && typeof addr === 'object') {
        serverPort = addr.port;
        console.log(`Stream server listening on port ${serverPort}`);
        resolve(serverPort);
      } else {
        reject(new Error('Failed to start stream server'));
      }
    });

    streamServer.on('error', reject);
  });
}

export function getStreamPort(): number {
  return serverPort;
}

export function stopStreamServer(): void {
  if (streamServer) {
    streamServer.close();
    streamServer = null;
  }
}

/**
 * Handle an incoming stream request.
 * URL format: /stream/{nodeId}
 */
async function handleStreamRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  // Enable absolute permissive CORS so Next.js UI can fetch raw text
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${serverPort}`);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (pathParts[0] !== 'stream' || !pathParts[1]) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const nodeId = pathParts[1];
  const node = getNode(nodeId);

  if (!node || node.entity_type !== 'FILE') {
    res.writeHead(404);
    res.end('File not found');
    return;
  }

  const chunks = getChunks(nodeId);
  if (chunks.length === 0) {
    res.writeHead(404);
    res.end('No chunks found');
    return;
  }

  const totalSize = node.total_size;
  const mimeType = node.mime_type || 'application/octet-stream';
  const rangeHeader = req.headers.range;

  if (!rangeHeader) {
    // Full file request - serve entire file
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': totalSize,
      'Accept-Ranges': 'bytes',
    });
    await streamAllChunks(chunks, res);
    return;
  }

  // Parse Range header: "bytes=START-END"
  const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!rangeMatch) {
    res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
    res.end();
    return;
  }

  const rangeStart = parseInt(rangeMatch[1], 10);
  const rangeEnd = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : totalSize - 1;

  if (rangeStart >= totalSize || rangeEnd >= totalSize || rangeStart > rangeEnd) {
    res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
    res.end();
    return;
  }

  const contentLength = rangeEnd - rangeStart + 1;

  res.writeHead(206, {
    'Content-Type': mimeType,
    'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
    'Content-Length': contentLength,
    'Accept-Ranges': 'bytes',
  });

  await streamRange(chunks, rangeStart, rangeEnd, node, res);
}

/**
 * Stream all chunks sequentially as a full file.
 */
async function streamAllChunks(chunks: PhysicalChunk[], res: http.ServerResponse): Promise<void> {
  const passthrough = new PassThrough();
  passthrough.pipe(res);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.raw_url) continue;

    await new Promise<void>((resolve, reject) => {
      fetchAndPipe(chunk.raw_url!, 0, chunk.chunk_size - 1, passthrough, i < chunks.length - 1)
        .then(resolve)
        .catch(reject);
    });
  }

  passthrough.end();
}

/**
 * Stream a specific byte range spanning one or more chunks.
 * Implements the cross-boundary PassThrough concatenation logic.
 */
async function streamRange(
  chunks: PhysicalChunk[],
  globalStart: number,
  globalEnd: number,
  node: VirtualNode,
  res: http.ServerResponse
): Promise<void> {
  const passthrough = new PassThrough();
  passthrough.pipe(res);

  // Calculate which chunks we need
  const startChunkIdx = Math.floor(globalStart / CHUNK_SIZE);
  const endChunkIdx = Math.floor(globalEnd / CHUNK_SIZE);

  for (let i = startChunkIdx; i <= endChunkIdx && i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.raw_url) continue;

    // Calculate local byte offsets within this chunk
    let localStart: number;
    let localEnd: number;

    if (i === startChunkIdx) {
      localStart = globalStart % CHUNK_SIZE;
    } else {
      localStart = 0;
    }

    if (i === endChunkIdx) {
      localEnd = globalEnd % CHUNK_SIZE;
      // Handle edge case: if globalEnd is at a chunk boundary
      if (globalEnd % CHUNK_SIZE === 0 && globalEnd > 0 && i > 0) {
        localEnd = chunk.chunk_size - 1;
      }
    } else {
      localEnd = chunk.chunk_size - 1;
    }

    // Ensure we don't exceed actual chunk size
    localEnd = Math.min(localEnd, chunk.chunk_size - 1);

    const isLast = i === endChunkIdx || i === chunks.length - 1;
    await fetchAndPipe(chunk.raw_url, localStart, localEnd, passthrough, !isLast);
  }

  passthrough.end();
}

/**
 * Fetch bytes from a GitHub raw URL and pipe into a PassThrough stream.
 * Uses the {end: false} flag for non-final chunks to keep the stream open.
 */
async function fetchAndPipe(
  url: string,
  localStart: number,
  localEnd: number,
  passthrough: PassThrough,
  keepOpen: boolean
): Promise<void> {
  const response = await fetch(url, {
    headers: {
      'Range': `bytes=${localStart}-${localEnd}`,
    },
  });

  if (!response.ok && response.status !== 206) {
    throw new Error(`Failed to fetch chunk: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  return new Promise<void>((resolve, reject) => {
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (!keepOpen) {
              // Don't end the passthrough - it will be ended by the caller
            }
            resolve();
            return;
          }
          if (value) {
            const canContinue = passthrough.write(Buffer.from(value));
            if (!canContinue) {
              // Backpressure: wait for drain
              await new Promise<void>((drainResolve) => {
                passthrough.once('drain', drainResolve);
              });
            }
          }
        }
      } catch (err) {
        reject(err);
      }
    };
    pump();
  });
}

/**
 * Get the local streaming URL for a file.
 */
export function getStreamUrl(nodeId: string): string {
  return `http://127.0.0.1:${serverPort}/stream/${nodeId}`;
}
