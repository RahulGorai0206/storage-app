'use client';

import React, { useCallback } from 'react';
import { useDrive } from '@/contexts/DriveContext';
import type { VirtualNode } from '@/lib/types';
import {
  Folder,
  FileText,
  FileVideo,
  FileAudio,
  FileImage,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  File,
  MoreVertical,
  Download,
  Trash2,
  Pencil,
  Play,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function getFileIcon(node: VirtualNode) {
  if (node.entity_type === 'DIRECTORY') {
    return <Folder className="h-10 w-10 text-blue-400 fill-blue-400/20" />;
  }
  const mime = node.mime_type || '';
  if (mime.startsWith('video/')) return <FileVideo className="h-10 w-10 text-purple-400" />;
  if (mime.startsWith('audio/')) return <FileAudio className="h-10 w-10 text-pink-400" />;
  if (mime.startsWith('image/')) return <FileImage className="h-10 w-10 text-green-400" />;
  if (mime.includes('pdf')) return <FileText className="h-10 w-10 text-red-400" />;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('tar') || mime.includes('gzip'))
    return <FileArchive className="h-10 w-10 text-amber-400" />;
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv'))
    return <FileSpreadsheet className="h-10 w-10 text-emerald-400" />;
  if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json') || mime.includes('html') || mime.includes('css'))
    return <FileCode className="h-10 w-10 text-cyan-400" />;
  return <File className="h-10 w-10 text-muted-foreground" />;
}

function getSmallIcon(node: VirtualNode) {
  if (node.entity_type === 'DIRECTORY') return <Folder className="h-4 w-4 text-blue-400 fill-blue-400/20" />;
  const mime = node.mime_type || '';
  if (mime.startsWith('video/')) return <FileVideo className="h-4 w-4 text-purple-400" />;
  if (mime.startsWith('audio/')) return <FileAudio className="h-4 w-4 text-pink-400" />;
  if (mime.startsWith('image/')) return <FileImage className="h-4 w-4 text-green-400" />;
  if (mime.includes('pdf')) return <FileText className="h-4 w-4 text-red-400" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isMediaFile(node: VirtualNode): boolean {
  const mime = node.mime_type || '';
  return mime.startsWith('video/') || mime.startsWith('audio/');
}

function isTextFile(node: VirtualNode): boolean {
  const mime = node.mime_type || '';
  const name = node.logical_name.toLowerCase();
  
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript') || mime.includes('typescript')) {
    return true;
  }
  
  // Also check popular extensions if OS mapping failed
  const exts = ['.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.py', '.rb', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.sh', '.yaml', '.yml', '.env'];
  return exts.some(ext => name.endsWith(ext));
}

interface FileItemMenuProps {
  node: VirtualNode;
  onRename: (node: VirtualNode) => void;
}

function FileItemActions({ node, onRename }: FileItemMenuProps) {
  const { deleteNode, downloadFile, openMediaPlayer, openTextViewer, navigateTo } = useDrive();

  return (
    <>
      {node.entity_type === 'DIRECTORY' && (
        <ContextMenuItem onClick={() => navigateTo(node.node_id)} className="gap-3 cursor-pointer">
          <Folder className="h-4 w-4" /> Open
        </ContextMenuItem>
      )}
      {isMediaFile(node) && (
        <ContextMenuItem onClick={() => openMediaPlayer(node)} className="gap-3 cursor-pointer">
          <Play className="h-4 w-4" /> Play
        </ContextMenuItem>
      )}
      {isTextFile(node) && (
        <ContextMenuItem onClick={() => openTextViewer(node)} className="gap-3 cursor-pointer">
          <FileText className="h-4 w-4" /> View Code
        </ContextMenuItem>
      )}
      {node.entity_type === 'FILE' && (
        <ContextMenuItem onClick={() => downloadFile(node.node_id)} className="gap-3 cursor-pointer">
          <Download className="h-4 w-4" /> Download
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={() => onRename(node)} className="gap-3 cursor-pointer">
        <Pencil className="h-4 w-4" /> Rename
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => deleteNode(node.node_id)} className="gap-3 cursor-pointer text-destructive focus:text-destructive">
        <Trash2 className="h-4 w-4" /> Delete
      </ContextMenuItem>
    </>
  );
}

function DropdownActions({ node, onRename }: FileItemMenuProps) {
  const { deleteNode, downloadFile, openMediaPlayer, openTextViewer, navigateTo } = useDrive();

  return (
    <>
      {node.entity_type === 'DIRECTORY' && (
        <DropdownMenuItem onClick={() => navigateTo(node.node_id)} className="gap-3 cursor-pointer">
          <Folder className="h-4 w-4" /> Open
        </DropdownMenuItem>
      )}
      {isMediaFile(node) && (
        <DropdownMenuItem onClick={() => openMediaPlayer(node)} className="gap-3 cursor-pointer">
          <Play className="h-4 w-4" /> Play
        </DropdownMenuItem>
      )}
      {isTextFile(node) && (
        <DropdownMenuItem onClick={() => openTextViewer(node)} className="gap-3 cursor-pointer">
          <FileText className="h-4 w-4" /> View Code
        </DropdownMenuItem>
      )}
      {node.entity_type === 'FILE' && (
        <DropdownMenuItem onClick={() => downloadFile(node.node_id)} className="gap-3 cursor-pointer">
          <Download className="h-4 w-4" /> Download
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => onRename(node)} className="gap-3 cursor-pointer">
        <Pencil className="h-4 w-4" /> Rename
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => deleteNode(node.node_id)} className="gap-3 cursor-pointer text-destructive focus:text-destructive">
        <Trash2 className="h-4 w-4" /> Delete
      </DropdownMenuItem>
    </>
  );
}

interface FileGridProps {
  onRename: (node: VirtualNode) => void;
}

export function FileGrid({ onRename }: FileGridProps) {
  const { children, navigateTo, viewMode, isLoading, openMediaPlayer, openTextViewer, authStatus } = useDrive();

  const handleDoubleClick = useCallback((node: VirtualNode) => {
    if (node.entity_type === 'DIRECTORY') {
      navigateTo(node.node_id);
    } else if (isMediaFile(node)) {
      openMediaPlayer(node);
    } else if (isTextFile(node)) {
      openTextViewer(node);
    }
  }, [navigateTo, openMediaPlayer, openTextViewer]);

  if (!authStatus.authenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground py-24">
        <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center">
          <Folder className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Authentication Required</p>
          <p className="text-sm mt-1 max-w-sm">You must be securely signed in via the Settings menu to access or upload files to this infinite drive.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3' : 'flex flex-col gap-1'}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={viewMode === 'grid'
              ? 'shimmer rounded-xl h-36'
              : 'shimmer rounded-lg h-12'
            } />
          ))}
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground py-24">
        <Folder className="h-20 w-20 opacity-20" />
        <div className="text-center">
          <p className="text-lg font-medium">This folder is empty</p>
          <p className="text-sm mt-1">Upload files or create a new folder to get started</p>
        </div>
      </div>
    );
  }

  // ===== Grid View =====
  if (viewMode === 'grid') {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {children.map((node) => (
            <ContextMenu key={node.node_id}>
              <ContextMenuTrigger className="block">
                <div
                  className="file-card group relative flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4 cursor-pointer hover:bg-accent/50"
                  onDoubleClick={() => handleDoubleClick(node)}
                >
                  {/* Icon */}
                  <div className="relative">
                    {getFileIcon(node)}
                    {isMediaFile(node) && (
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full gradient-glow">
                        <Play className="h-2.5 w-2.5 fill-white text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <span className="text-xs text-center font-medium truncate w-full">
                    {node.logical_name}
                  </span>

                  {/* Size */}
                  {node.entity_type === 'FILE' && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatSize(node.total_size)}
                    </span>
                  )}

                  {/* More button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownActions node={node} onRename={onRename} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <FileItemActions node={node} onRename={onRename} />
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </div>
    );
  }

  // ===== List View =====
  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="w-[50%]">Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {children.map((node) => (
            <ContextMenu key={node.node_id}>
              <ContextMenuTrigger
                render={
                  <TableRow
                    className="cursor-pointer hover:bg-accent/30 border-border/30"
                    onDoubleClick={() => handleDoubleClick(node)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {getSmallIcon(node)}
                        <span className="truncate">{node.logical_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {node.entity_type === 'FILE' ? formatSize(node.total_size) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(node.updated_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer block">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownActions node={node} onRename={onRename} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                }
              />
              <ContextMenuContent className="w-48">
                <FileItemActions node={node} onRename={onRename} />
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
