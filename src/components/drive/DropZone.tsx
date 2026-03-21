'use client';

import React, { useState, useCallback } from 'react';
import { useDrive } from '@/contexts/DriveContext';
import type { VirtualNode } from '@/lib/types';
import { Upload as UploadIcon } from 'lucide-react';

interface DropZoneProps {
  children: React.ReactNode;
}

export function DropZone({ children }: DropZoneProps) {
  const { uploadFiles } = useDrive();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = React.useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // In Electron, File objects have a .path property
      const filePaths = Array.from(files).map((f: File & { path?: string }) => f.path).filter(Boolean) as string[];
      if (filePaths.length > 0) {
        await uploadFiles(filePaths);
      }
    }
  }, [uploadFiles]);

  return (
    <div
      className="relative flex-1 flex flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drop overlay */}
      {isDragging && (
        <div className="drop-overlay absolute inset-0 z-50 flex flex-col items-center justify-center bg-primary/5 border-2 border-dashed border-primary/40 rounded-xl m-4 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full gradient-glow p-4">
              <UploadIcon className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Drop files to upload</p>
              <p className="text-sm text-muted-foreground mt-1">
                Files over 25 MB will be automatically split into chunks
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
