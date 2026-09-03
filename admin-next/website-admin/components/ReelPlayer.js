"use client";

import { useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';

export default function ReelPlayer({ src, poster, title = 'Video Reel' }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  // Sync muted property directly to DOM element (React issue workaround)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Autoplay/Pause when entering/leaving viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              // Ensure it's muted before calling play for browser autoplay compliance
              videoRef.current.muted = true;
              setIsMuted(true);
              
              videoRef.current.play()
                .catch((err) => {
                  console.log('Autoplay blocked by browser policy:', err);
                });
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.6 } // Play when at least 60% of the video is visible
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handlePlayPause = (e) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play()
        .catch((err) => console.log('Play blocked:', err));
    } else {
      videoRef.current.pause();
    }
  };

  const handleMuteToggle = (e) => {
    e.stopPropagation(); // Avoid triggering play/pause
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (duration > 0) {
      setProgress((current / duration) * 100);
    }
  };

  const handleVideoEnded = () => {
    // Loop the Reel
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => console.log(err));
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fj-reel-container max-w-[280px] w-full mx-auto relative border border-gray-800 rounded-3xl overflow-hidden aspect-[9/16] bg-[#0d1117] shadow-2xl flex items-center justify-center"
      onClick={handlePlayPause}
      style={{
        maxWidth: '280px',
        width: '100%',
        aspectRatio: '9/16',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        backgroundColor: '#0d1117',
        margin: '0 auto',
        cursor: 'pointer',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="auto"
        className="w-full h-full object-contain"
        muted={isMuted}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          pointerEvents: 'none',
        }}
        aria-label={title}
      />

      {/* Play/Pause Center Indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg scale-100 animate-pulse">
            <Play size={32} fill="currentColor" style={{ marginLeft: '4px' }} />
          </div>
        </div>
      )}

      {/* Corner Volume Control */}
      <button
        onClick={handleMuteToggle}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white border border-white/10 hover:bg-black/80 hover:scale-105 transition-all duration-200"
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 10,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        aria-label={isMuted ? "Unmute video" : "Mute video"}
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Progress Bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/20"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
        }}
      >
        <div 
          className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-100 ease-linear"
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #ff416c 0%, #ff4b2b 100%)',
          }}
        />
      </div>
    </div>
  );
}
