'use client';

import React from 'react';
import { useDrive } from '@/contexts/DriveContext';
import { X, CheckCircle2, AlertCircle, Loader2, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function UploadOverlay() {
  const { uploadQueue, cancelUpload } = useDrive();

  if (uploadQueue.length === 0) return null;

  return (
    <div className="upload-overlay fixed bottom-4 right-4 z-50 w-96 max-h-80 overflow-auto rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {uploadQueue.filter(t => t.status !== 'done' && t.status !== 'error').length > 0
              ? `Uploading ${uploadQueue.filter(t => t.status !== 'done' && t.status !== 'error').length} file(s)`
              : 'Uploads complete'}
          </span>
        </div>
      </div>

      {/* Upload items */}
      <div className="divide-y divide-border/30">
        {uploadQueue.map((task) => (
          <div key={task.id} className="px-4 py-3 flex items-center gap-3 group">
            {/* Status icon */}
            <div className="shrink-0">
              {task.status === 'done' ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : task.status === 'error' ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.fileName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={task.progress} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground shrink-0 w-24 text-right truncate">
                  {task.status === 'chunking' && 'Splitting...'}
                  {task.status === 'uploading' && `${task.progress}% (${task.chunksCompleted}/${task.chunksTotal})`}
                  {task.status === 'committing' && '100% (Finishing...)'}
                  {task.status === 'done' && 'Complete'}
                  {task.status === 'error' && 'Failed'}
                  {task.status === 'pending' && 'Queued'}
                </span>
              </div>
              {task.error && (
                <p className="text-[10px] text-destructive mt-1 truncate">{task.error}</p>
              )}
            </div>

            {/* Cancel Actions */}
            {(task.status === 'pending' || task.status === 'chunking' || task.status === 'uploading') && (
              <button
                onClick={() => cancelUpload(task.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                title="Cancel Upload"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
