'use client';

import React, { useState } from 'react';
import type { VirtualNode } from '@/lib/types';
import { DriveProvider } from '@/contexts/DriveContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { FileGrid } from '@/components/drive/FileGrid';
import { UploadOverlay } from '@/components/drive/UploadOverlay';
import { NewFolderDialog } from '@/components/drive/NewFolderDialog';
import { RenameDialog } from '@/components/drive/RenameDialog';
import { SettingsDialog } from '@/components/drive/SettingsDialog';
import { DeviceFlowDialog } from '@/components/auth/DeviceFlowDialog';
import { MediaPlayer } from '@/components/drive/MediaPlayer';
import { DropZone } from '@/components/drive/DropZone';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';

function DriveApp() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [renameNode, setRenameNode] = useState<VirtualNode | null>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header onOpenNewFolder={() => setNewFolderOpen(true)} />

        <DropZone>
          <ScrollArea className="flex-1">
            <FileGrid onRename={(node) => setRenameNode(node)} />
          </ScrollArea>
        </DropZone>
      </div>

      {/* Overlays & Dialogs */}
      <UploadOverlay />
      <MediaPlayer />
      <NewFolderDialog open={newFolderOpen} onOpenChange={setNewFolderOpen} />
      <RenameDialog open={renameNode !== null} onOpenChange={(open) => !open && setRenameNode(null)} node={renameNode} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DeviceFlowDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

export default function Home() {
  return (
    <TooltipProvider>
      <DriveProvider>
        <DriveApp />
      </DriveProvider>
    </TooltipProvider>
  );
}
