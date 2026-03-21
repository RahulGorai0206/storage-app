'use client';

import React, { useState, useEffect } from 'react';
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
import { Settings, Github } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, saveSettings } = useDrive();
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [clientId, setClientId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOwner(settings.owner);
    setRepo(settings.repo);
    setBranch(settings.branch || 'main');
    setClientId(settings.clientId);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings({ owner, repo, branch, clientId });
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your GitHub repository for cloud storage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Github className="h-3.5 w-3.5" />
              GitHub App Client ID
            </label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Iv1.abc123def456"
              className="bg-background/50 font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Register a GitHub App at github.com/settings/apps with repo permissions and Device Flow enabled.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Repository Owner</label>
              <Input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="your-username"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Repository Name</label>
              <Input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="cloud-storage"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Branch</label>
            <Input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="bg-background/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gradient-glow border-0 text-white"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
