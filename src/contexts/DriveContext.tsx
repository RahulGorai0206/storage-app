'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { VirtualNode, UploadTask, AuthStatus, AppSettings } from '@/lib/types';

interface DriveContextValue {
  // Current state
  currentDirId: string | null;
  children: VirtualNode[];
  breadcrumb: VirtualNode[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;

  // Auth
  authStatus: AuthStatus;
  refreshAuth: () => Promise<void>;

  // Settings
  settings: AppSettings;
  saveSettings: (settings: AppSettings) => Promise<void>;

  // Upload queue
  uploadQueue: UploadTask[];

  // Navigation
  navigateTo: (nodeId: string | null) => Promise<void>;
  refresh: () => Promise<void>;

  // Actions
  createFolder: (name: string) => Promise<void>;
  uploadFiles: (filePaths: string[]) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  renameNode: (nodeId: string, newName: string) => Promise<void>;
  downloadFile: (nodeId: string) => Promise<void>;
  openMediaPlayer: (node: VirtualNode) => void;
  closeMediaPlayer: () => void;
  openFileDialog: () => Promise<void>;
  cancelUpload: (taskId: string) => Promise<void>;

  // View
  setViewMode: (mode: 'grid' | 'list') => void;

  // Media player
  mediaNode: VirtualNode | null;
  mediaStreamUrl: string | null;
}

const DriveContext = createContext<DriveContextValue | null>(null);

export function useDrive(): DriveContextValue {
  const ctx = useContext(DriveContext);
  if (!ctx) throw new Error('useDrive must be used within DriveProvider');
  return ctx;
}

// Check if we're running in Electron
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export function DriveProvider({ children: childrenProp }: { children: React.ReactNode }) {
  const [currentDirId, setCurrentDirId] = useState<string | null>(null);
  const [childNodes, setChildNodes] = useState<VirtualNode[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<VirtualNode[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ authenticated: false });
  const [settings, setSettings] = useState<AppSettings>({ owner: '', repo: '', branch: 'main', clientId: '' });
  const [uploadQueue, setUploadQueue] = useState<UploadTask[]>([]);
  const [mediaNode, setMediaNode] = useState<VirtualNode | null>(null);
  const [mediaStreamUrl, setMediaStreamUrl] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Load initial state
  useEffect(() => {
    if (!isElectron()) return;

    const loadInitial = async () => {
      try {
        const [auth, s] = await Promise.all([
          window.electronAPI.getAuthStatus(),
          window.electronAPI.getSettings(),
        ]);
        setAuthStatus(auth);
        setSettings(s);
        await loadChildren(null);
      } catch (err) {
        console.error('Failed to load initial state:', err);
      }
    };

    loadInitial();

    // Listen for upload progress
    const cleanup = window.electronAPI.onUploadProgress((task: unknown) => {
      const uploadTask = task as UploadTask;
      setUploadQueue(prev => {
        const idx = prev.findIndex(t => t.id === uploadTask.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = uploadTask;
          // Remove completed tasks after 3 seconds
          if (uploadTask.status === 'done' || uploadTask.status === 'error') {
            setTimeout(() => {
              setUploadQueue(q => q.filter(t => t.id !== uploadTask.id));
            }, 3000);
          }
          return updated;
        }
        return [...prev, uploadTask];
      });
    });

    cleanupRef.current = cleanup;
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  const loadChildren = useCallback(async (parentId: string | null) => {
    if (!isElectron()) return;
    setIsLoading(true);
    try {
      const nodes = await window.electronAPI.getChildren(parentId);
      setChildNodes(nodes);
    } catch (err) {
      console.error('Failed to load children:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBreadcrumb = useCallback(async (nodeId: string | null) => {
    if (!isElectron() || !nodeId) {
      setBreadcrumb([]);
      return;
    }
    try {
      const path = await window.electronAPI.getPath(nodeId);
      setBreadcrumb(path);
    } catch (err) {
      console.error('Failed to load breadcrumb:', err);
    }
  }, []);

  const navigateTo = useCallback(async (nodeId: string | null) => {
    setCurrentDirId(nodeId);
    await Promise.all([loadChildren(nodeId), loadBreadcrumb(nodeId)]);
  }, [loadChildren, loadBreadcrumb]);

  const refresh = useCallback(async () => {
    await loadChildren(currentDirId);
  }, [currentDirId, loadChildren]);

  const refreshAuth = useCallback(async () => {
    if (!isElectron()) return;
    const auth = await window.electronAPI.getAuthStatus();
    setAuthStatus(auth);
  }, []);

  const createFolder = useCallback(async (name: string) => {
    if (!isElectron()) return;
    await window.electronAPI.createFolder(name, currentDirId);
    await refresh();
  }, [currentDirId, refresh]);

  const uploadFiles = useCallback(async (filePaths: string[]) => {
    if (!isElectron()) return;
    try {
      await window.electronAPI.uploadFiles(filePaths, currentDirId);
      await refresh();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }, [currentDirId, refresh]);

  const deleteNodeAction = useCallback(async (nodeId: string) => {
    if (!isElectron()) return;
    await window.electronAPI.deleteNode(nodeId);
    await refresh();
  }, [refresh]);

  const renameNode = useCallback(async (nodeId: string, newName: string) => {
    if (!isElectron()) return;
    await window.electronAPI.renameNode(nodeId, newName);
    await refresh();
  }, [refresh]);

  const downloadFile = useCallback(async (nodeId: string) => {
    if (!isElectron()) return;
    await window.electronAPI.downloadFile(nodeId);
  }, []);

  const openMediaPlayer = useCallback(async (node: VirtualNode) => {
    if (!isElectron()) return;
    const url = await window.electronAPI.getStreamUrl(node.node_id);
    setMediaNode(node);
    setMediaStreamUrl(url);
  }, []);

  const closeMediaPlayer = useCallback(() => {
    setMediaNode(null);
    setMediaStreamUrl(null);
  }, []);

  const openFileDialog = useCallback(async () => {
    if (!isElectron()) return;
    const filePaths = await window.electronAPI.openFileDialog();
    if (filePaths.length > 0) {
      await uploadFiles(filePaths);
    }
  }, [uploadFiles]);

  const cancelUpload = useCallback(async (taskId: string) => {
    if (!isElectron()) return;
    await window.electronAPI.cancelUpload(taskId);
    setUploadQueue(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'error', error: 'Cancelling...' } : t
    ));
  }, []);

  const saveSettingsAction = useCallback(async (newSettings: AppSettings) => {
    if (!isElectron()) return;
    await window.electronAPI.saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  const value: DriveContextValue = {
    currentDirId,
    children: childNodes,
    breadcrumb,
    viewMode,
    isLoading,
    authStatus,
    refreshAuth,
    settings,
    saveSettings: saveSettingsAction,
    uploadQueue,
    navigateTo,
    refresh,
    createFolder,
    uploadFiles,
    deleteNode: deleteNodeAction,
    renameNode,
    downloadFile,
    openMediaPlayer,
    closeMediaPlayer,
    openFileDialog,
    cancelUpload,
    setViewMode,
    mediaNode,
    mediaStreamUrl,
  };

  return <DriveContext.Provider value={value}>{childrenProp}</DriveContext.Provider>;
}
