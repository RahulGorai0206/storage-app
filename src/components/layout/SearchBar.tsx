'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, FileVideo, FileAudio, FileImage, Folder, X, FileCode } from 'lucide-react';
import { useDrive } from '@/contexts/DriveContext';
import { VirtualNode } from '@/lib/types';
import { isMediaFile, isTextFile } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export function SearchBar() {
  const { searchFiles, searchResults, isSearching, navigateTo, openMediaPlayer, openTextViewer, clearSearch } = useDrive();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        searchFiles(query);
        setIsOpen(true);
      } else {
        clearSearch();
        setIsOpen(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchFiles, clearSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = async (node: VirtualNode) => {
    setIsOpen(false);
    setQuery('');
    
    // 1. Navigate to parent
    await navigateTo(node.parent_id);
    
    // 2. Open file if applicable
    if (isMediaFile(node)) {
      openMediaPlayer(node);
    } else if (isTextFile(node)) {
      openTextViewer(node);
    }
  };

  const getIcon = (node: VirtualNode) => {
    if (node.entity_type === 'DIRECTORY') return <Folder className="h-4 w-4 text-blue-400" />;
    const mime = node.mime_type || '';
    if (mime.startsWith('video/')) return <FileVideo className="h-4 w-4 text-purple-400" />;
    if (mime.startsWith('audio/')) return <FileAudio className="h-4 w-4 text-pink-400" />;
    if (mime.startsWith('image/')) return <FileImage className="h-4 w-4 text-green-400" />;
    if (isTextFile(node)) return <FileCode className="h-4 w-4 text-cyan-400" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md ml-4">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search your drive..."
          className="pl-9 pr-9 bg-secondary/30 border-border/50 h-9 text-sm focus:bg-background focus:ring-1 focus:ring-primary/20 transition-all rounded-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); clearSearch(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border shadow-2xl z-50 overflow-hidden max-h-[450px] flex flex-col rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 px-4 py-2 bg-muted/50 backdrop-blur-md">
            {isSearching ? 'Searching...' : `Results (${searchResults.length})`}
          </div>
          <div className="overflow-y-auto bg-card/95 backdrop-blur-md">
            {searchResults.length > 0 ? (
              searchResults.map((node) => (
                <div
                  key={node.node_id}
                  onClick={() => handleResultClick(node)}
                  className="flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer transition-colors group border-l-2 border-transparent hover:border-primary"
                >
                  <div className="p-2 rounded-lg bg-secondary group-hover:bg-background transition-colors">
                    {getIcon(node)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {node.logical_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 truncate font-medium">
                      {node.parent_path}
                    </span>
                  </div>
                  {(isMediaFile(node) || isTextFile(node)) && (
                    <div className="text-[10px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      OPEN FILE
                    </div>
                  )}
                </div>
              ))
            ) : !isSearching && (
              <div className="p-12 text-center flex flex-col items-center gap-2">
                <Search className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No matches found for "{query}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
