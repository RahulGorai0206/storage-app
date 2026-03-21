// ===== Database / Domain Types =====

export interface VirtualNode {
  node_id: string;
  parent_id: string | null;
  logical_name: string;
  entity_type: 'DIRECTORY' | 'FILE';
  total_size: number;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhysicalChunk {
  chunk_id: string;
  node_id: string;
  sequence_index: number;
  git_blob_sha: string | null;
  chunk_size: number;
  raw_url: string | null;
  sha256_hash: string | null;
}

// ===== Upload Types =====

export interface UploadTask {
  id: string;
  fileName: string;
  totalSize: number;
  chunksTotal: number;
  chunksCompleted: number;
  status: 'pending' | 'chunking' | 'uploading' | 'committing' | 'done' | 'error';
  error?: string;
  progress: number; // 0-100
}

export interface ChunkInfo {
  index: number;
  start: number;
  end: number; // exclusive
  size: number;
  fileName: string; // e.g., "video.mp4.001"
}

// ===== Auth Types =====

export interface DeviceFlowResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface AuthStatus {
  authenticated: boolean;
  username?: string;
  avatarUrl?: string;
}

// ===== GitHub API Types =====

export interface GitBlob {
  sha: string;
  url: string;
}

export interface GitTreeItem {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: string;
}

export interface GitTree {
  sha: string;
  url: string;
  tree: GitTreeItem[];
}

export interface GitCommit {
  sha: string;
  url: string;
}

// ===== IPC API Surface =====

export interface ElectronAPI {
  // Auth
  startDeviceFlow: () => Promise<DeviceFlowResponse>;
  getAuthStatus: () => Promise<AuthStatus>;
  logout: () => Promise<void>;
  // Drive operations
  getChildren: (parentId: string | null) => Promise<VirtualNode[]>;
  getNode: (nodeId: string) => Promise<VirtualNode | null>;
  uploadFiles: (filePaths: string[], parentId: string | null) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<VirtualNode>;
  deleteNode: (nodeId: string) => Promise<void>;
  downloadFile: (nodeId: string) => Promise<string>; // returns saved path
  getPath: (nodeId: string) => Promise<VirtualNode[]>;
  renameNode: (nodeId: string, newName: string) => Promise<VirtualNode>;
  // Streaming
  getStreamUrl: (nodeId: string) => Promise<string>;
  // Settings
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  // File dialog
  openFileDialog: () => Promise<string[]>;
  // Events
  onUploadProgress: (callback: (event: unknown, task: UploadTask) => void) => () => void;
  // Upload Management
  cancelUpload: (taskId: string) => Promise<void>;
}

export interface AppSettings {
  owner: string;
  repo: string;
  branch: string;
  clientId: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
