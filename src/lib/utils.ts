import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { VirtualNode } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMediaFile(node: VirtualNode): boolean {
  const mime = node.mime_type || '';
  return mime.startsWith('video/') || mime.startsWith('audio/');
}

export function isTextFile(node: VirtualNode): boolean {
  const mime = node.mime_type || '';
  const name = node.logical_name.toLowerCase();
  
  // Explicitly exclude binary/document formats that might have "xml" or "text" in mime
  if (
    mime.includes('officedocument') || 
    mime.includes('ms-word') || 
    mime.includes('ms-excel') || 
    mime.includes('ms-powerpoint') ||
    mime.includes('pdf') ||
    mime.includes('rtf')
  ) {
    return false;
  }

  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('javascript') || mime.includes('typescript')) {
    return true;
  }
  
  // Only allow actual source code/plain text extensions
  const textExts = [
    '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.html', 
    '.py', '.rb', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', 
    '.sh', '.yaml', '.yml', '.env', '.sql', '.xml', '.svg', '.ini', '.conf'
  ];
  
  return textExts.some(ext => name.endsWith(ext));
}
