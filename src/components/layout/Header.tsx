'use client';

import React from 'react';
import { useDrive } from '@/contexts/DriveContext';
import { FolderPlus, Upload, LayoutGrid, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onOpenNewFolder: () => void;
}

export function Header({ onOpenNewFolder }: HeaderProps) {
  const { breadcrumb, navigateTo, viewMode, setViewMode, openFileDialog } = useDrive();

  return (
    <div className="flex items-center justify-between gap-4 px-6 h-16 border-b border-border bg-background/50 backdrop-blur-sm">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => navigateTo(null)}
                className="cursor-pointer hover:text-foreground transition-colors text-sm font-medium"
              >
                My Drive
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumb.map((node) => (
              <React.Fragment key={node.node_id}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => navigateTo(node.node_id)}
                    className="cursor-pointer hover:text-foreground transition-colors text-sm"
                  >
                    {node.logical_name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* New Button */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium gradient-glow border-0 text-white hover:opacity-90 transition-opacity cursor-pointer">
            <Plus className="h-4 w-4" />
            New
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onOpenNewFolder} className="gap-3 cursor-pointer">
              <FolderPlus className="h-4 w-4" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openFileDialog} className="gap-3 cursor-pointer">
              <Upload className="h-4 w-4" />
              Upload File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Toggle */}
        <div className="flex items-center rounded-lg bg-secondary/50 p-0.5">
          <Tooltip>
            <TooltipTrigger
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-md cursor-pointer ${viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>Grid view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-md cursor-pointer ${viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>List view</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
