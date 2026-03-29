'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Folder, Database, ShieldCheck, ArrowRight, HardDrive, Info, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dbPath, setDbPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get default DB path on mount
    window.electronAPI.getDbPath().then(setDbPath);
  }, []);

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      setDbPath(folder);
    }
  };

  const handleFinalize = async () => {
    setIsLoading(true);
    try {
      // Save terms acceptance
      const settings = await window.electronAPI.getSettings();
      await window.electronAPI.saveSettings({
        ...settings,
        termsAccepted: true
      });

      // Restart app with the selected DB path
      await window.electronAPI.relaunchApp(dbPath);
    } catch (err) {
      console.error('Failed to finalize setup:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl border-border/50 bg-card/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {step === 1 && <ShieldCheck className="h-6 w-6 text-primary" />}
            {step === 2 && <BookOpen className="h-6 w-6 text-primary" />}
            {step === 3 && <Database className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 1 && 'Terms and Conditions'}
            {step === 2 && 'Project Overview'}
            {step === 3 && 'Database Storage'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Please review and accept our terms to continue.'}
            {step === 2 && 'How GitHub Drive works and its key features.'}
            {step === 3 && 'Choose where you want to store your local drive database.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="h-64 overflow-y-auto rounded-md border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground leading-relaxed">
                <h3 className="font-semibold text-foreground mb-2">GitHub Drive Usage Agreement</h3>
                <p className="mb-4">
                  GitHub Drive provides a bridge between your local storage and GitHub repositories. 
                  By using this application, you acknowledge that your data will be stored on GitHub servers 
                  and managed via their API.
                </p>
                <h4 className="font-semibold text-foreground mb-1">1. Data Storage</h4>
                <p className="mb-4">
                  The application splits files into chunks and uploads them as Git blobs. 
                  This is an experimental method of storage and should not replace primary backups for critical data.
                </p>
                <h4 className="font-semibold text-foreground mb-1">2. Local Database</h4>
                <p className="mb-4">
                  A local SQLite database is used to track your virtual file system. 
                  You are responsible for the security and backup of this local database file.
                </p>
                <h4 className="font-semibold text-foreground mb-1">3. GitHub API Limits</h4>
                <p className="mb-4">
                  Users must respect GitHub API rate limits. High-frequency operations may result in temporary blocks from GitHub.
                </p>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted} 
                  onCheckedChange={(checked: boolean) => setTermsAccepted(checked)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the terms and conditions
                </label>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div className="h-64 overflow-y-auto rounded-md border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground space-y-4">
                <section>
                  <h3 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                    <Info className="h-4 w-4 text-primary" />
                    What is GitHub Drive?
                  </h3>
                  <p>
                    GitHub Drive turns any GitHub repository into a virtual cloud storage system. 
                    It bypasses file size limits by automatically splitting large files into smaller chunks.
                  </p>
                </section>
                
                <section>
                  <h3 className="font-semibold text-foreground mb-1">Key Features</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Unlimited Storage</strong>: Limited only by your GitHub account/repo capacity.</li>
                    <li><strong>Smart Chunking</strong>: Large files are split into 20MB blobs for seamless uploads.</li>
                    <li><strong>Media Streaming</strong>: Watch videos or listen to music directly from your GitHub repo.</li>
                    <li><strong>Secure & Private</strong>: Your data stays in your own repositories.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-foreground mb-1">Getting Started</h3>
                  <p>
                    After setup, you'll need to configure your <strong>GitHub App Client ID</strong>, 
                    <strong>Repository Name</strong>, and <strong>Owner</strong> in the settings.
                  </p>
                </section>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  Local Storage Path
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={dbPath} 
                    readOnly 
                    className="bg-background/50 font-mono text-xs" 
                    placeholder="Select a folder..."
                  />
                  <Button variant="outline" onClick={handleSelectFolder} className="shrink-0 gap-2">
                    <Folder className="h-4 w-4" />
                    Browse
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The database file `github-drive.db` will be created inside this folder.
                  Ensure you have write permissions to this directory.
                </p>
              </div>
              
              <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
                <p className="text-xs text-primary/80 leading-relaxed">
                  <strong>Important:</strong> You are choosing your database location for the first time. 
                  Once set, this path cannot be changed easily to prevent data synchronization issues.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border/50 pt-6">
          <div className="flex gap-1">
            <div className={`h-1.5 w-8 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 w-8 rounded-full ${step === 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 w-8 rounded-full ${step === 3 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isLoading}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button 
                onClick={() => setStep(step + 1)} 
                disabled={step === 1 && !termsAccepted}
                className="gradient-glow border-0 text-white gap-2"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleFinalize} 
                disabled={!dbPath || isLoading}
                className="gradient-glow border-0 text-white gap-2"
              >
                {isLoading ? 'Setting up...' : 'Finish Setup'}
                {!isLoading && <ShieldCheck className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
