'use client';

import React, { useState, useEffect } from 'react';
import { useDrive } from '@/contexts/DriveContext';
import type { VirtualNode } from '@/lib/types';
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
import { Pencil } from 'lucide-react';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: VirtualNode | null;
}

export function RenameDialog({ open, onOpenChange, node }: RenameDialogProps) {
  const { renameNode } = useDrive();
  const [name, setName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (node) setName(node.logical_name);
  }, [node]);

  const handleRename = async () => {
    if (!name.trim() || !node) return;
    setIsRenaming(true);
    try {
      await renameNode(node.node_id, name.trim());
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to rename:', err);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Rename
          </DialogTitle>
          <DialogDescription>
            Enter a new name for &quot;{node?.logical_name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New name"
          className="bg-background/50"
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            disabled={!name.trim() || isRenaming}
            className="gradient-glow border-0 text-white"
          >
            {isRenaming ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
