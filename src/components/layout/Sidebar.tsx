'use client';

import React, { useState, useCallback } from 'react';
import { useDrive } from '@/contexts/DriveContext';
import { HardDrive, FolderPlus, Upload, Settings, LogOut, LogIn, User, Cloud, ChevronLeft, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ onOpenSettings, onOpenAuth, collapsed, onToggleCollapse }: SidebarProps) {
  const { navigateTo, openFileDialog, authStatus } = useDrive();

  const handleLogout = useCallback(async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.logout();
    window.location.reload();
  }, []);

  return (
    <div className={`glass-sidebar relative flex flex-col border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 h-16">
        <div className="gradient-glow rounded-lg p-2 shrink-0">
          <Cloud className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <h1 className="text-lg font-bold gradient-glow-text tracking-tight truncate">
            GitHub Drive
          </h1>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Actions */}
      <div className="flex flex-col gap-1 p-3">
        <Tooltip>
          <TooltipTrigger
            onClick={() => navigateTo(null)}
            className={`flex items-center gap-3 rounded-md ${collapsed ? 'px-3' : 'px-4'} h-10 hover:bg-sidebar-accent text-sm cursor-pointer w-full text-left`}
          >
            <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!collapsed && <span>My Drive</span>}
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">My Drive</TooltipContent>}
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            onClick={openFileDialog}
            className={`flex items-center gap-3 rounded-md ${collapsed ? 'px-3' : 'px-4'} h-10 hover:bg-sidebar-accent text-sm cursor-pointer w-full text-left`}
          >
            <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!collapsed && <span>Upload File</span>}
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Upload File</TooltipContent>}
        </Tooltip>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1 p-3">
        <Separator className="opacity-50 mb-2" />

        {/* User info */}
        {authStatus.authenticated && !collapsed && (
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            {authStatus.avatarUrl ? (
              <img src={authStatus.avatarUrl} alt="" className="w-7 h-7 rounded-full ring-2 ring-primary/30" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground truncate">{authStatus.username}</span>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger
            onClick={onOpenSettings}
            className={`flex items-center gap-3 rounded-md ${collapsed ? 'px-3' : 'px-4'} h-10 hover:bg-sidebar-accent text-sm cursor-pointer w-full text-left`}
          >
            <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!collapsed && <span>Settings</span>}
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Settings</TooltipContent>}
        </Tooltip>

        {authStatus.authenticated ? (
          <Tooltip>
            <TooltipTrigger
              onClick={handleLogout}
              className={`flex items-center gap-3 rounded-md ${collapsed ? 'px-3' : 'px-4'} h-10 hover:bg-sidebar-accent text-sm cursor-pointer w-full text-left text-destructive`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger
              onClick={onOpenAuth}
              className={`flex items-center gap-3 rounded-md ${collapsed ? 'px-3' : 'px-4'} h-10 hover:bg-sidebar-accent text-sm cursor-pointer w-full text-left`}
            >
              <LogIn className="h-4 w-4 shrink-0 text-muted-foreground" />
              {!collapsed && <span>Sign In</span>}
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sign In</TooltipContent>}
          </Tooltip>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </div>
  );
}
