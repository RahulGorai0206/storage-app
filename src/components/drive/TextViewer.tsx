'use client';

import React, { useEffect, useState } from 'react';
import { useDrive } from '@/contexts/DriveContext';
import { X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TextViewer() {
  const { textNode, textStreamUrl, closeTextViewer } = useDrive();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTextViewer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeTextViewer]);

  useEffect(() => {
    if (!textStreamUrl) {
      setContent('');
      setLoading(true);
      return;
    }
    
    setLoading(true);
    fetch(textStreamUrl)
      .then(res => res.text())
      .then(data => {
        // Cap preview size in browser memory to 500k characters (~500KB)
        if (data.length > 500000) {
          setContent(data.substring(0, 500000) + '\n\n... [File too large to display entirely in browser memory. Please download to view full contents] ...');
        } else {
          setContent(data);
        }
        setLoading(false);
      })
      .catch(err => {
        setContent(`Error loading text file: ${(err as Error).message}`);
        setLoading(false);
      });
  }, [textStreamUrl]);

  if (!textNode || !textStreamUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-12">
      <div className="relative w-full max-w-5xl h-full flex flex-col bg-card border border-border shadow-2xl rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-sm">{textNode.logical_name}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={closeTextViewer} className="h-8 w-8 p-0 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-zinc-950">
          {loading ? (
            <div className="h-full w-full flex flex-col gap-4 items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Fetching char streams natively...</p>
            </div>
          ) : (
            <pre className="text-[13px] leading-relaxed font-mono whitespace-pre-wrap break-words text-zinc-300">
              <code>{content}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
