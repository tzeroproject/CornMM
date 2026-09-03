import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Settings, 
  Sliders,
  Sparkles
} from 'lucide-react';
import { Video } from '../../types';
import { videoService } from '../../services/videoService';
import { getBunnyIframeUrl } from '../../lib/bunny';

interface VideoPlayerProps {
  video: Video;
  onProgress?: (progressSeconds: number, durationSeconds: number) => void;
  onComplete?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onProgress, onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
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

  // View count trigger flag to ensure view is recorded only once per viewing session
  const viewRecordedRef = useRef(false);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
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

    // Call throttled watch history progress
    if (onProgress) {
      onProgress(curr, dur);
    }

    // Reliable server-side view count trigger after 5 seconds of continuous playback
    if (!viewRecordedRef.current && curr >= 5) {
      viewRecordedRef.current = true;
      videoService.recordView(video.id);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onComplete) onComplete();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    const target = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration);
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (nextMuted) {
      videoRef.current.volume = 0;
    } else {
      videoRef.current.volume = volume > 0 ? volume : 0.8;
      setVolume(volume > 0 ? volume : 0.8);
    }
  };

  const setSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // If user chooses Bunny Direct Iframe Player Mode
  if (useBunnyIframeEmbed && video.bunny_video_id) {
    const iframeSrc = getBunnyIframeUrl({
      videoId: video.bunny_video_id,
      autoplay: true,
    });

    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <iframe
          src={iframeSrc}
          loading="lazy"
          className="w-full h-full border-0"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen
          title={video.title}
        />
        <button
          onClick={() => setUseBunnyIframeEmbed(false)}
          className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-[#111]/90 text-xs text-zinc-300 hover:text-white border border-white/10 shadow-md backdrop-blur-md"
        >
          Switch to Custom Player
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Bunny Embed Switcher Badge */}
      <div className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setUseBunnyIframeEmbed(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111111]/90 text-[11px] font-medium text-amber-300 border border-amber-500/30 backdrop-blur-md hover:bg-[#161616]"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Bunny Stream Embed
        </button>
      </div>

      {/* Center Big Play Button when paused */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-amber-500 hover:text-black hover:border-transparent transition-all duration-300">
            <Play className="w-7 h-7 fill-current translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Player Controls Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-2">
        {/* Progress Bar Slider */}
        <div className="flex items-center gap-2 group/slider">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none bg-white/20 accent-amber-400 cursor-pointer hover:h-2 transition-all"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={() => seekRelative(-10)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-zinc-300 hover:text-white"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 rounded appearance-none bg-white/20 accent-amber-400 cursor-pointer hidden group-hover/vol:block transition-all"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[11px] font-mono text-zinc-300 ml-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Speed, Quality, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }}
                className="px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] font-mono transition-colors"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-9 right-0 w-24 bg-[#0e0e0e] border border-white/10 rounded-xl p-1 shadow-2xl z-30">
                  <div className="text-[10px] text-zinc-400 font-semibold px-2 py-1 border-b border-white/5">Speed</div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                        playbackSpeed === s ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-white/5 text-zinc-300'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Quality"
              >
                <Sliders className="w-4 h-4" />
              </button>

              {showQualityMenu && (
                <div className="absolute bottom-9 right-0 w-36 bg-[#0e0e0e] border border-white/10 rounded-xl p-1 shadow-2xl z-30">
                  <div className="text-[10px] text-zinc-400 font-semibold px-2 py-1 border-b border-white/5">Adaptive HLS</div>
                  {['Auto (Adaptive)', '1080p (FHD)', '720p (HD)', '480p (SD)'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setSelectedQuality(q); setShowQualityMenu(false); }}
                      className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                        selectedQuality === q ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-white/5 text-zinc-300'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Fullscreen (f)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
