'use client';

import React, { useState } from 'react';
import { useDrive } from '@/contexts/DriveContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderPlus } from 'lucide-react';

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewFolderDialog({ open, onOpenChange }: NewFolderDialogProps) {
  const { createFolder } = useDrive();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await createFolder(name.trim());
      setName('');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            New Folder
          </DialogTitle>
          <DialogDescription>
            Enter a name for your new folder.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Folder name"
          className="bg-background/50"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="gradient-glow border-0 text-white"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
