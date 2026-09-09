import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Settings } from 'lucide-react';
import { Video } from '../../types';
import { videoService } from '../../services/videoService';

interface VideoPlayerProps {
  video: Video;
  onProgress?: (progressSeconds: number, durationSeconds: number) => void;
  onComplete?: () => void;
}

const FALLBACK_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onProgress, onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastProgressRef = useRef(0);
  const fallbackUsedRef = useRef(false);
  const viewRecordedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const provider = String(video.provider || '').toLowerCase();
  const url = String(video.video_url || '').trim();
  const providerId = String((video as any).provider_id || '').trim();

  const isUqloadEmbed = provider === 'uqload' || /uqload\.vc\/e\//i.test(url);
  const isDoodstreamEmbed = provider === 'doodstream' || /dood(?:\.to|\.la|\.so)\/e\//i.test(url);
  const isFilemoonEmbed = provider === 'filemoon' || /filemoon\.org\//i.test(url);
  const isStreamtapeEmbed = provider === 'streamtape' || /streamtape\.com\/(?:e|v)\/[^/?#]+/i.test(url);
  const isAnyEmbed = provider === 'embed' || provider === 'any_embed' || provider === 'any-embed' || (provider === '' && /^https?:\/\//i.test(url));
  const isExternal = isUqloadEmbed || isDoodstreamEmbed || isFilemoonEmbed || isStreamtapeEmbed || isAnyEmbed;

  useEffect(() => {
    if (isExternal) return;

    const el = videoRef.current;
    if (!el) return;

    let hls: Hls | null = null;
    let disposed = false;
    fallbackUsedRef.current = false;
    viewRecordedRef.current = false;
    lastProgressRef.current = 0;
    setIsPlaying(false);
    setHasStarted(false);
    setCurrentTime(0);
    setDuration(video.duration || 0);

    const fallback = () => {
      if (disposed || fallbackUsedRef.current) return;
      fallbackUsedRef.current = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      el.src = FALLBACK_URL;
      el.load();
    };

    const onError = () => fallback();
    el.addEventListener('error', onError);

    if (!url) {
      fallback();
    } else if (url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          backBufferLength: 30,
          fragLoadingMaxRetry: 3,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
        });
        hls.loadSource(url);
        hls.attachMedia(el);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) fallback();
        });
      } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = url;
      } else {
        fallback();
      }
    } else {
      el.src = url;
    }

    el.defaultMuted = false;
    el.muted = false;
    el.volume = 0.9;

    return () => {
      disposed = true;
      el.removeEventListener('error', onError);
      if (hls) hls.destroy();
    };
  }, [video.id, video.video_url, video.duration, url, isExternal]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      if (!isMuted) {
        el.muted = false;
        el.volume = volume > 0 ? volume : 0.9;
      }
      el.play().then(() => {
        setIsPlaying(true);
        setHasStarted(true);
      }).catch(() => {});
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;

    const curr = el.currentTime;
    const dur = el.duration || video.duration || 0;
    setCurrentTime(curr);
    setDuration(dur);

    if (onProgress && (curr - lastProgressRef.current >= 5 || curr < 1)) {
      lastProgressRef.current = curr;
      onProgress(curr, dur);
    }

    if (!viewRecordedRef.current && curr >= 5) {
      viewRecordedRef.current = true;
      videoService.recordView(video.id);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const seekRelative = (seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    const time = Math.min(Math.max(0, el.currentTime + seconds), duration || el.duration || Infinity);
    el.currentTime = time;
    setCurrentTime(time);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    const muted = !isMuted;
    setIsMuted(muted);
    el.muted = muted;
    if (!muted) {
      const nextVolume = volume || 0.9;
      el.volume = nextVolume;
      setVolume(nextVolume);
    }
  };

  const setSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) container.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      if (event.key === ' ' || event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePlay();
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFullscreen();
      } else if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        toggleMute();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekRelative(5);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekRelative(-5);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, duration, volume, isMuted]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  if (isExternal) {
    let src = url;

    if (isFilemoonEmbed) {
      src = providerId
        ? `https://filemoon.org/${encodeURIComponent(providerId)}/embed`
        : url.replace(/https?:\/\/filemoon\.org\/en\//i, 'https://filemoon.org/');
      if (!/\/embed(?:[/?#]|$)/i.test(src)) src = src.replace(/\/?$/, '/embed');
    } else if (isStreamtapeEmbed) {
      const match = url.match(/streamtape\.com\/(?:e|v)\/([^/?#]+)/i);
      src = match?.[1] ? `https://streamtape.com/e/${match[1]}` : url;
    }

    const iframeMatch = src.match(/src\s*=\s*["'](.*?)["']/i);
    if (iframeMatch?.[1]) src = iframeMatch[1];

    return (
      <div ref={containerRef} className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <iframe
          src={src || undefined}
          title={video.title}
          loading="eager"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="group relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 select-none">
      <video
        ref={videoRef}
        poster={video.thumbnail_url}
        preload="metadata"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => { setIsPlaying(false); onComplete?.(); }}
        onLoadedMetadata={() => {
          const el = videoRef.current;
          if (el) {
            el.muted = isMuted;
            el.volume = isMuted ? 0 : (volume || 0.9);
            setDuration(el.duration || video.duration || 0);
          }
        }}
        playsInline
        controlsList="nodownload noplaybackrate"
        className={`w-full h-full object-contain cursor-pointer ${hasStarted ? '' : 'blur-2xl scale-105'}`}
      />

      {!hasStarted && (
        <button aria-label="Play video" onClick={togglePlay} className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
          <span className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
            <Play className="w-7 h-7 fill-current" />
          </span>
        </button>
      )}

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 sm:p-4 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <input
          aria-label="Video progress"
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={Math.min(currentTime, duration || 100)}
          onChange={handleSeek}
          className="w-full h-1.5 appearance-none bg-white/20 accent-amber-400 cursor-pointer"
        />

        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <button aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} className="p-1.5 rounded-lg hover:bg-white/10">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button aria-label="Rewind 10 seconds" onClick={() => seekRelative(-10)} className="p-1.5 rounded-lg hover:bg-white/10">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button aria-label={isMuted ? 'Unmute' : 'Mute'} onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/10">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="font-mono text-[11px]">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <button aria-label="Playback speed" onClick={() => setShowSpeedMenu((value) => !value)} className="p-1.5 rounded-lg hover:bg-white/10">
                <Settings className="w-4 h-4" />
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-9 right-0 p-1 rounded-xl bg-[#111] border border-white/10 shadow-xl flex gap-1">
                  {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button key={speed} onClick={() => setSpeed(speed)} className={`px-2 py-1 rounded text-[10px] ${playbackSpeed === speed ? 'bg-amber-500 text-black' : 'text-white hover:bg-white/10'}`}>
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/10">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
