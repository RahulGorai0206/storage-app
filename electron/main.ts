import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { initDatabase, getChildren, getNode, insertNode, deleteNode, getPath, updateNode, getChunks, getSetting, setSetting } from './services/database';
import { initAuth, startDeviceFlow, pollForToken, getAuthStatus, getToken, logout } from './services/auth';
import { needsChunking, calculateChunks, readChunkAsBase64, computeSHA256, getMimeType, CHUNK_SIZE, computeSHA256FromBuffer, readChunk } from './services/chunker';
import { atomicUpload, deleteFromRepo, checkRepo } from './services/github';
import { startStreamServer, getStreamUrl, stopStreamServer } from './services/streaming';
import type { UploadTask, AppSettings } from './types';

const canceledUploads = new Set<string>();

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'GitHub Drive',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? false : true,
    backgroundColor: '#09090b',
  });

  // In dev, load from Next.js dev server
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ===== IPC Handlers =====

function registerIpcHandlers(): void {
  // --- Auth ---
  ipcMain.handle('auth:start-device-flow', async () => {
    const clientId = getSetting('clientId') || '';
    if (!clientId) throw new Error('GitHub Client ID not configured. Go to Settings.');
    const flow = await startDeviceFlow(clientId);
    // Open verification URL in default browser
    shell.openExternal(flow.verification_uri);
    // Start polling in background
    pollForToken(clientId, flow.device_code, flow.interval).catch(console.error);
    return flow;
  });

  ipcMain.handle('auth:get-status', async () => {
    return getAuthStatus();
  });

  ipcMain.handle('auth:logout', async () => {
    logout();
  });

  // --- Drive Operations ---
  ipcMain.handle('drive:get-children', async (_event, parentId: string | null) => {
    return getChildren(parentId);
  });

  ipcMain.handle('drive:get-node', async (_event, nodeId: string) => {
    return getNode(nodeId);
  });

  ipcMain.handle('drive:create-folder', async (_event, name: string, parentId: string | null) => {
    return insertNode(parentId, name, 'DIRECTORY');
  });

  ipcMain.handle('drive:rename-node', async (_event, nodeId: string, newName: string) => {
    return updateNode(nodeId, { logical_name: newName });
  });

  ipcMain.handle('drive:delete-node', async (_event, nodeId: string) => {
    const node = getNode(nodeId);
    if (!node) throw new Error('Node not found');

    // If it's a file, also delete from GitHub
    if (node.entity_type === 'FILE') {
      const chunks = getChunks(nodeId);
      const owner = getSetting('owner') || '';
      const repo = getSetting('repo') || '';
      const branch = getSetting('branch') || 'main';

      if (chunks.length > 0 && owner && repo) {
        try {
          const filePaths = chunks.map(c => {
            if (!c.raw_url) return null;
            const parts = c.raw_url.split(`${branch}/`);
            return parts.length > 1 ? parts[1] : null;
          }).filter(Boolean) as string[];
          await deleteFromRepo(owner, repo, branch, filePaths, `Deleted ${node.logical_name}`);
        } catch (err) {
          console.error('Failed to delete from GitHub:', err);
        }
      }
    }

    deleteNode(nodeId);
  });

  ipcMain.handle('drive:cancel-upload', async (_event, taskId: string) => {
    canceledUploads.add(taskId);
  });

  ipcMain.handle('drive:upload-files', async (event, filePaths: string[], parentId: string | null) => {
    const owner = getSetting('owner') || '';
    const repo = getSetting('repo') || '';
    const branch = getSetting('branch') || 'main';

    if (!owner || !repo) throw new Error('Repository not configured. Go to Settings.');
    if (!getToken()) throw new Error('Not authenticated. Please sign in.');

    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      const mimeType = getMimeType(filePath);

      const uploadTask: UploadTask = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName,
        totalSize: stats.size,
        chunksTotal: 1,
        chunksCompleted: 0,
        status: 'pending',
        progress: 0,
      };

      const sendProgress = () => {
        mainWindow?.webContents.send('upload:progress', uploadTask);
      };

      try {
        const { findFileNode, upsertNodeWithChunks } = await import('./services/database');
        const existingNode = findFileNode(parentId, fileName);
        const nodeId = existingNode ? existingNode.node_id : crypto.randomUUID();

        if (needsChunking(filePath)) {
          // Large file: chunk and upload atomically
          const chunkInfos = calculateChunks(filePath);
          uploadTask.chunksTotal = chunkInfos.length;
          uploadTask.status = 'chunking';
          sendProgress();

          uploadTask.status = 'uploading';
          sendProgress();

          let completed = 0;
          const lazyChunks = chunkInfos.map(chunkInfo => ({
            fileName: `${nodeId}_${chunkInfo.fileName}`,
            size: chunkInfo.size,
            read: async () => {
              const buffer = await readChunk(filePath, chunkInfo);
              return {
                base64Content: buffer.toString('base64'),
                sha256: computeSHA256FromBuffer(buffer)
              };
            }
          }));

          // Atomic upload to GitHub with real-time stream execution
          const results = await atomicUpload(
            owner, repo, branch,
            'storage/',
            lazyChunks,
            `Upload: ${fileName}`,
            () => {
              completed++;
              uploadTask.chunksCompleted = completed;
              uploadTask.progress = Math.round((completed / uploadTask.chunksTotal) * 100);
              sendProgress();
            },
            () => canceledUploads.has(uploadTask.id)
          );

          uploadTask.status = 'committing';
          sendProgress();

          // Store in local database
          upsertNodeWithChunks(
            nodeId,
            parentId,
            fileName,
            stats.size,
            mimeType,
            results.map((r, i) => ({
              sequenceIndex: i,
              chunkSize: lazyChunks[i].size,
              gitBlobSha: r.blobSha,
              rawUrl: r.rawUrl,
              sha256Hash: r.sha256Hash || '',
            }))
          );
        } else {
          // Small file: direct upload
          uploadTask.status = 'uploading';
          sendProgress();

          const buffer = fs.readFileSync(filePath);
          const base64 = buffer.toString('base64');
          const sha256 = computeSHA256FromBuffer(buffer);

          const results = await atomicUpload(
            owner, repo, branch,
            'storage/',
            [{ fileName: `${nodeId}_${fileName}`, base64Content: base64 }],
            `Upload: ${fileName}`,
            undefined,
            () => canceledUploads.has(uploadTask.id)
          );

          // Store in database as single chunk
          upsertNodeWithChunks(
            nodeId,
            parentId,
            fileName,
            stats.size,
            mimeType,
            [{
              sequenceIndex: 0,
              chunkSize: stats.size,
              gitBlobSha: results[0].blobSha,
              rawUrl: results[0].rawUrl,
              sha256Hash: sha256,
            }]
          );
        }

        uploadTask.status = 'done';
        uploadTask.progress = 100;
        uploadTask.chunksCompleted = uploadTask.chunksTotal;
        sendProgress();
        canceledUploads.delete(uploadTask.id);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'STATUS_CANCELLED') {
          uploadTask.status = 'error';
          uploadTask.error = 'Cancelled by user';
        } else {
          uploadTask.status = 'error';
          uploadTask.error = err instanceof Error ? err.message : 'Unknown error';
        }
        sendProgress();
        canceledUploads.delete(uploadTask.id);
        continue;
      }
    }
  });

  ipcMain.handle('drive:download-file', async (_event, nodeId: string) => {
    const node = getNode(nodeId);
    if (!node || node.entity_type !== 'FILE') throw new Error('File not found');

    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: node.logical_name,
    });

    if (result.canceled || !result.filePath) return '';

    const chunks = getChunks(nodeId);
    const writeStream = fs.createWriteStream(result.filePath);

    for (const chunk of chunks) {
      if (!chunk.raw_url) continue;
      const response = await fetch(chunk.raw_url);
      const buffer = Buffer.from(await response.arrayBuffer());
      writeStream.write(buffer);
    }

    writeStream.end();
    return result.filePath;
  });

  ipcMain.handle('drive:get-path', async (_event, nodeId: string) => {
    return getPath(nodeId);
  });

  ipcMain.handle('drive:get-stream-url', async (_event, nodeId: string) => {
    return getStreamUrl(nodeId);
  });

  // --- Settings ---
  ipcMain.handle('settings:get', async () => {
    return {
      owner: getSetting('owner') || '',
      repo: getSetting('repo') || '',
      branch: getSetting('branch') || 'main',
      clientId: getSetting('clientId') || '',
    } as AppSettings;
  });

  ipcMain.handle('settings:save', async (_event, settings: AppSettings) => {
    setSetting('owner', settings.owner);
    setSetting('repo', settings.repo);
    setSetting('branch', settings.branch || 'main');
    setSetting('clientId', settings.clientId);
  });

  // --- File Dialog ---
  ipcMain.handle('dialog:open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
    });
    return result.canceled ? [] : result.filePaths;
  });
}

// ===== App Lifecycle =====

app.whenReady().then(async () => {
  // Initialize services
  initDatabase(app.getPath('userData'));
  initAuth(app.getPath('userData'));

  // Start streaming server
  await startStreamServer();

  // Register IPC handlers before creating window
  registerIpcHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopStreamServer();
  if (process.platform !== 'darwin') app.quit();
});
