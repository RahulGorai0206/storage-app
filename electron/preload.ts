const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  startDeviceFlow: () => ipcRenderer.invoke('auth:start-device-flow'),
  getAuthStatus: () => ipcRenderer.invoke('auth:get-status'),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Drive operations
  getChildren: (parentId: string | null) => ipcRenderer.invoke('drive:get-children', parentId),
  getNode: (nodeId: string) => ipcRenderer.invoke('drive:get-node', nodeId),
  uploadFiles: (filePaths: string[], parentId: string | null) => ipcRenderer.invoke('drive:upload-files', filePaths, parentId),
  createFolder: (name: string, parentId: string | null) => ipcRenderer.invoke('drive:create-folder', name, parentId),
  deleteNode: (nodeId: string) => ipcRenderer.invoke('drive:delete-node', nodeId),
  downloadFile: (nodeId: string) => ipcRenderer.invoke('drive:download-file', nodeId),
  getPath: (nodeId: string) => ipcRenderer.invoke('drive:get-path', nodeId),
  renameNode: (nodeId: string, newName: string) => ipcRenderer.invoke('drive:rename-node', nodeId, newName),

  // Streaming
  getStreamUrl: (nodeId: string) => ipcRenderer.invoke('drive:get-stream-url', nodeId),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Record<string, string>) => ipcRenderer.invoke('settings:save', settings),

  // File dialog
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),

  // Events
  onUploadProgress: (callback: (...args: unknown[]) => void) => {
    const handler = (_event: unknown, ...args: unknown[]) => callback(...args);
    ipcRenderer.on('upload:progress', handler);
    return () => ipcRenderer.removeListener('upload:progress', handler);
  },

  // Upload Management
  cancelUpload: (taskId: string) => ipcRenderer.invoke('drive:cancel-upload', taskId),
});
