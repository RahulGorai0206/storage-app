'use client';

import React, { useState, useCallback } from 'react';
import { useDrive } from '@/contexts/DriveContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Github, Copy, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';

interface DeviceFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceFlowDialog({ open, onOpenChange }: DeviceFlowDialogProps) {
  const { refreshAuth } = useDrive();
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startFlow = useCallback(async () => {
    if (!window.electronAPI) return;
    setStatus('waiting');
    setError(null);

    try {
      const flow = await window.electronAPI.startDeviceFlow();
      setUserCode(flow.user_code);
      setVerificationUrl(flow.verification_uri);

      // Poll for completion
      const poll = setInterval(async () => {
        const auth = await window.electronAPI.getAuthStatus();
        if (auth.authenticated) {
          clearInterval(poll);
          setStatus('success');
          await refreshAuth();
          setTimeout(() => onOpenChange(false), 1500);
        }
      }, 3000);

      // Timeout after expiration
      setTimeout(() => {
        clearInterval(poll);
        if (status === 'waiting') {
          setStatus('error');
          setError('Device code expired. Please try again.');
        }
      }, 900000); // 15 minutes
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start authentication');
    }
  }, [refreshAuth, onOpenChange, status]);

  const copyCode = useCallback(() => {
    if (userCode) {
      navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [userCode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Sign in with GitHub
          </DialogTitle>
          <DialogDescription>
            Authenticate using the GitHub Device Flow to securely connect your account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {status === 'idle' && (
            <Button
              onClick={startFlow}
              className="gap-2 gradient-glow border-0 text-white px-8 py-6 text-base"
            >
              <Github className="h-5 w-5" />
              Start Authentication
            </Button>
          )}

          {status === 'waiting' && userCode && (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter this code at GitHub:
                </p>
                <div
                  className="flex items-center justify-center gap-3 cursor-pointer group"
                  onClick={copyCode}
                >
                  <span className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground">
                    {userCode}
                  </span>
                  {copied ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <Copy className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Waiting for authorization...</span>
              </div>

              {verificationUrl && (
                <p className="text-xs text-muted-foreground text-center">
                  A browser window should have opened. If not, visit{' '}
                  <a href={verificationUrl} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
                    {verificationUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
            </>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-medium">Successfully authenticated!</span>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={startFlow} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
