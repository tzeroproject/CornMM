import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Sliders } from 'lucide-react';
import { Video } from '../../types';
import { videoService } from '../../services/videoService';
import { getBunnyIframeUrl } from '../../lib/bunny';

interface VideoPlayerProps {
  video: Video;
  onProgress?: (progressSeconds: number, durationSeconds: number) => void;
  onComplete?: () => void;
}

const FALLBACK_MP4 = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onProgress, onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRecordedRef = useRef(false);
  const lastProgressSentRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState('1080p (FHD)');
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [useBunnyIframeEmbed, setUseBunnyIframeEmbed] = useState(false);

  const isExternalEmbed = Boolean(
    video.video_url &&
    !video.video_url.includes('.m3u8') &&
    (video.video_url.includes('http') || video.video_url.startsWith('//')) &&
    (!video.bunny_video_id || video.bunny_video_id === 'embed')
  );

  const getEmbedSrc = useCallback((value: string) => {
    const srcMatch = value.match(/src\s*=\s*["'](.*?)["']/i);
    return srcMatch?.[1] || value;
  }, []);

  useEffect(() => {
    if (isExternalEmbed) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let hls: Hls | null = null;
    const url = video.video_url;
    viewRecordedRef.current = false;
    lastProgressSentRef.current = 0;
    setIsPlaying(false);
    setHasStarted(false);

    if (url && url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(url);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            videoEl.src = FALLBACK_MP4;
            videoEl.load();
          }
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = url;
      } else {
        videoEl.src = FALLBACK_MP4;
      }
    } else if (url) {
      videoEl.src = url;
    }

    const handleVideoError = () => {
      if (videoEl.src !== FALLBACK_MP4) {
        videoEl.src = FALLBACK_MP4;
        videoEl.load();
      }
    };
    videoEl.addEventListener('error', handleVideoError);

    return () => {
      videoEl.removeEventListener('error', handleVideoError);
      if (hls) hls.destroy();
    };
  }, [video.id, video.video_url, isExternalEmbed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'f') { e.preventDefault(); toggleFullscreen(); }
      else if (e.key === 'm') { e.preventDefault(); toggleMute(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); seekRelative(5); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); seekRelative(-5); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => { setIsPlaying(true); setHasStarted(true); }).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || video.duration || 0;
    setCurrentTime(curr);
    setDuration(dur);

    // Save watch history at most once every 5 seconds instead of on every timeupdate.
    if (onProgress && (curr - lastProgressSentRef.current >= 5 || curr < 1)) {
      lastProgressSentRef.current = curr;
      onProgress(curr, dur);
    }

    // Count one view after 5 seconds. This request never changes the page location.
    if (!viewRecordedRef.current && curr >= 5) {
      viewRecordedRef.current = true;
      void videoService.recordView(video.id);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onComplete?.();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoRef.current) videoRef.current.currentTime = target;
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    const target = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration || Infinity);
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    setIsMuted(value === 0);
    if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    videoRef.current.muted = next;
    if (next) videoRef.current.volume = 0;
    else {
      const nextVolume = volume > 0 ? volume : 0.8;
      videoRef.current.volume = nextVolume;
      setVolume(nextVolume);
    }
  };

  const setSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isExternalEmbed) {
    const embedSrc = getEmbedSrc(video.video_url || '');
    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        {!hasStarted && (
          <button
            type="button"
            aria-label="Play video"
            className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer overflow-hidden bg-black"
            onClick={() => setHasStarted(true)}
          >
            <img src={video.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
            <span className="relative z-10 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-amber-500 hover:text-black transition-all">
              <Play className="w-8 h-8 fill-current ml-1" />
            </span>
          </button>
        )}
        {hasStarted && (
          <iframe
            key={embedSrc}
            src={embedSrc}
            title={video.title || 'Video player'}
            className="w-full h-full border-0"
            loading="eager"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    );
  }

  if (useBunnyIframeEmbed && video.bunny_video_id) {
    const iframeSrc = getBunnyIframeUrl({ videoId: video.bunny_video_id, autoplay: hasStarted });
    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        {!hasStarted && (
          <button type="button" aria-label="Play video" className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer overflow-hidden bg-black" onClick={() => setHasStarted(true)}>
            <img src={video.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <span className="relative z-10 w-16 h-16 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-amber-500 hover:text-black transition-all"><Play className="w-8 h-8 fill-current ml-1" /></span>
          </button>
        )}
        {hasStarted && <iframe src={iframeSrc} title={video.title || 'Bunny video player'} loading="eager" className="w-full h-full border-0" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" />}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="group relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 select-none">
      <video
        ref={videoRef}
        poster={video.thumbnail_url}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        playsInline
        className={`w-full h-full object-contain cursor-pointer transition-all duration-700 ${!hasStarted ? 'blur-2xl scale-105' : 'blur-0 scale-100'}`}
      />

      <div className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setUseBunnyIframeEmbed(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111111]/90 text-[11px] font-medium text-amber-300 border border-amber-500/30 backdrop-blur-md">Bunny Stream Embed</button>
      </div>

      {!isPlaying && (
        <button type="button" aria-label="Play video" onClick={togglePlay} className={`absolute inset-0 flex items-center justify-center bg-black/40 ${!hasStarted ? 'backdrop-blur-2xl' : 'backdrop-blur-[1px]'} cursor-pointer transition-all duration-700`}>
          <span className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-amber-500 hover:text-black transition-all"><Play className="w-7 h-7 fill-current translate-x-0.5" /></span>
        </button>
      )}

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-2">
        <input type="range" min={0} max={duration || 100} step={0.1} value={currentTime} onChange={handleSeek} className="w-full h-1.5 rounded-lg appearance-none bg-white/20 accent-amber-400 cursor-pointer" />
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-1.5 rounded-lg hover:bg-white/10" title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}</button>
            <button onClick={() => seekRelative(-10)} className="p-1.5 rounded-lg hover:bg-white/10" title="Rewind 10s"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/10" title={isMuted ? 'Unmute' : 'Mute'}>{isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
            <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-16 h-1 rounded appearance-none bg-white/20 accent-amber-400" />
            <span className="text-[11px] font-mono text-zinc-300">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }} className="px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] font-mono">{playbackSpeed}x</button>
              {showSpeedMenu && <div className="absolute bottom-9 right-0 w-24 bg-[#0e0e0e] border border-white/10 rounded-xl p-1 shadow-2xl z-30">{[0.5,0.75,1,1.25,1.5,2].map(s => <button key={s} onClick={() => setSpeed(s)} className={`w-full text-left px-2 py-1 rounded text-xs ${playbackSpeed === s ? 'bg-amber-500 text-black font-semibold' : 'text-zinc-300 hover:bg-white/5'}`}>{s}x</button>)}</div>}
            </div>
            <div className="relative">
              <button onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }} className="p-1.5 rounded-lg hover:bg-white/10" title="Quality"><Sliders className="w-4 h-4" /></button>
              {showQualityMenu && <div className="absolute bottom-9 right-0 w-36 bg-[#0e0e0e] border border-white/10 rounded-xl p-1 shadow-2xl z-30">{['Auto (Adaptive)','1080p (FHD)','720p (HD)','480p (SD)'].map(q => <button key={q} onClick={() => { setSelectedQuality(q); setShowQualityMenu(false); }} className={`w-full text-left px-2 py-1 rounded text-xs ${selectedQuality === q ? 'bg-amber-500 text-black font-semibold' : 'text-zinc-300 hover:bg-white/5'}`}>{q}</button>)}</div>}
            </div>
            <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/10" title="Fullscreen">{isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
};