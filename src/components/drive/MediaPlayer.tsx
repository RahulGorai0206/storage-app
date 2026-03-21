'use client';

import React, { useRef, useEffect } from 'react';
import { useDrive } from '@/contexts/DriveContext';
import { X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MediaPlayer() {
  const { mediaNode, mediaStreamUrl, closeMediaPlayer } = useDrive();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMediaPlayer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeMediaPlayer]);

  if (!mediaNode || !mediaStreamUrl) return null;

  const isVideo = mediaNode.mime_type?.startsWith('video/');
  const isAudio = mediaNode.mime_type?.startsWith('audio/');

  return (
    <div className="media-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={closeMediaPlayer}
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Title */}
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-white font-medium text-sm">{mediaNode.logical_name}</h3>
      </div>

      {/* Video Player */}
      {isVideo && (
        <video
          ref={videoRef}
          src={mediaStreamUrl}
          controls
          autoPlay
          className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
          style={{ outline: 'none' }}
        />
      )}

      {/* Audio Player */}
      {isAudio && (
        <div className="flex flex-col items-center gap-8 p-12 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-center w-32 h-32 rounded-full gradient-glow">
            <Volume2 className="h-16 w-16 text-white" />
          </div>
          <h2 className="text-xl font-medium text-white">{mediaNode.logical_name}</h2>
          <audio
            ref={audioRef}
            src={mediaStreamUrl}
            controls
            autoPlay
            className="w-96"
            style={{ outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
