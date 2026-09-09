import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Settings, Sparkles } from 'lucide-react';
import { Video } from '../../types';
import { videoService } from '../../services/videoService';
import { getBunnyIframeUrl } from '../../lib/bunny';

interface VideoPlayerProps{video:Video;onProgress?:(progressSeconds:number,durationSeconds:number)=>void;onComplete?:()=>void}
const FALLBACK_URL='https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const VideoPlayer:React.FC<VideoPlayerProps>=({video,onProgress,onComplete})=>{
 const videoRef=useRef<HTMLVideoElement|null>(null),containerRef=useRef<HTMLDivElement|null>(null),lastProgressRef=useRef(0),fallbackUsedRef=useRef(false),viewRecordedRef=useRef(false);
 const[isPlaying,setIsPlaying]=useState(false),[hasStarted,setHasStarted]=useState(false),[currentTime,setCurrentTime]=useState(0),[duration,setDuration]=useState(video.duration||0),[volume,setVolume]=useState(.9),[isMuted,setIsMuted]=useState(false),[isFullscreen,setIsFullscreen]=useState(false),[playbackSpeed,setPlaybackSpeed]=useState(1),[showSpeedMenu,setShowSpeedMenu]=useState(false),[useBunnyIframeEmbed,setUseBunnyIframeEmbed]=useState(false);

 useEffect(()=>{
  const el=videoRef.current;if(!el)return;
  let hls:Hls|null=null,disposed=false;
  fallbackUsedRef.current=false;viewRecordedRef.current=false;lastProgressRef.current=0;
  setIsPlaying(false);setHasStarted(false);setCurrentTime(0);setDuration(video.duration||0);
  const fallback=()=>{if(disposed||fallbackUsedRef.current)return;fallbackUsedRef.current=true;if(hls){hls.destroy();hls=null}el.src=FALLBACK_URL;el.load()};
  const onError=()=>fallback();
  el.addEventListener('error',onError);
  const url=String(video.video_url||'').trim();
  if(!url)fallback();
  else if(url.includes('.m3u8')){
   if(Hls.isSupported()){
    hls=new Hls({enableWorker:true,lowLatencyMode:false,maxBufferLength:30,backBufferLength:30,fragLoadingMaxRetry:3,manifestLoadingMaxRetry:3,levelLoadingMaxRetry:3});
    hls.loadSource(url);hls.attachMedia(el);hls.on(Hls.Events.ERROR,(_e,d)=>{if(d.fatal)fallback()})
   }else if(el.canPlayType('application/vnd.apple.mpegurl'))el.src=url;else fallback()
  }else el.src=url;
  el.defaultMuted=false;
  el.muted=false;
  el.volume=.9;
  return()=>{disposed=true;el.removeEventListener('error',onError);if(hls)hls.destroy()}
 },[video.id,video.video_url,video.duration]);

 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName||''))return;if(e.key===' '||e.key.toLowerCase()==='k'){e.preventDefault();togglePlay()}else if(e.key.toLowerCase()==='f'){e.preventDefault();toggleFullscreen()}else if(e.key.toLowerCase()==='m'){e.preventDefault();toggleMute()}else if(e.key==='ArrowRight'){e.preventDefault();seekRelative(5)}else if(e.key==='ArrowLeft'){e.preventDefault();seekRelative(-5)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[isPlaying,duration,volume,isMuted]);

 const togglePlay=()=>{
  const el=videoRef.current;if(!el)return;
  if(el.paused){
   if(!isMuted){el.muted=false;el.volume=volume>0?volume:.9}
   el.play().then(()=>{setIsPlaying(true);setHasStarted(true)}).catch(()=>{});
  }else{el.pause();setIsPlaying(false)}
 };
 const handleTimeUpdate=()=>{const el=videoRef.current;if(!el)return;const curr=el.currentTime,dur=el.duration||video.duration||0;setCurrentTime(curr);setDuration(dur);if(onProgress&&(curr-lastProgressRef.current>=5||curr<1)){lastProgressRef.current=curr;onProgress(curr,dur)}if(!viewRecordedRef.current&&curr>=5){viewRecordedRef.current=true;videoService.recordView(video.id)}};
 const handleSeek=(e:React.ChangeEvent<HTMLInputElement>)=>{const t=Number(e.target.value);setCurrentTime(t);if(videoRef.current)videoRef.current.currentTime=t};
 const seekRelative=(s:number)=>{const el=videoRef.current;if(!el)return;const t=Math.min(Math.max(0,el.currentTime+s),duration||el.duration||Infinity);el.currentTime=t;setCurrentTime(t)};
 const toggleMute=()=>{const el=videoRef.current;if(!el)return;const m=!isMuted;setIsMuted(m);el.muted=m;if(!m){const v=volume||.9;el.volume=v;setVolume(v)}};
 const setSpeed=(s:number)=>{setPlaybackSpeed(s);if(videoRef.current)videoRef.current.playbackRate=s;setShowSpeedMenu(false)};
 const toggleFullscreen=()=>{const c=containerRef.current;if(!c)return;if(!document.fullscreenElement)c.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.().catch(()=>{})};
 useEffect(()=>{const f=()=>setIsFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',f);return()=>document.removeEventListener('fullscreenchange',f)},[]);
 const formatTime=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

 // External providers must always use their own iframe player. In particular,
 // DoodStream must not fall through to Bunny/native playback just because a
 // bunny_video_id is present on the same database row.
 const provider=String(video.provider||'').toLowerCase();
 const isUqloadEmbed=!!video.video_url&&(/uqload\.vc\/e\//i.test(video.video_url)||provider==='uqload');
 const isDoodstreamEmbed=provider==='doodstream' || /dood(?:\.to|\.la|\.so)\/e\//i.test(String(video.video_url||''));
 const isExternal=isDoodstreamEmbed || (isUqloadEmbed&&(!video.bunny_video_id||video.bunny_video_id==='embed'));

 if(isExternal||useBunnyIframeEmbed){
  let src=isExternal?video.video_url:getBunnyIframeUrl({videoId:video.bunny_video_id!,autoplay:hasStarted});
  const m=src?.match(/src\s*=\s*["'](.*?)["']/i);if(m?.[1])src=m[1];
  return <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
   {!hasStarted&&<button aria-label="Play video" onClick={()=>setHasStarted(true)} className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"><img src={video.thumbnail_url} alt="" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110"/><span className="absolute inset-0 bg-black/40"/><span className="z-20 w-16 h-16 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center"><Play className="w-8 h-8 fill-current ml-1"/></span></button>}
   {hasStarted&&<iframe src={src} title={video.title} loading="lazy" className="w-full h-full border-0" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin"/>}
  </div>
 }

 return <div ref={containerRef} className="group relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 select-none">
  <video ref={videoRef} poster={video.thumbnail_url} preload="metadata" onClick={togglePlay} onTimeUpdate={handleTimeUpdate} onEnded={()=>{setIsPlaying(false);onComplete?.()}} onLoadedMetadata={()=>{const el=videoRef.current;if(el){el.muted=isMuted;el.volume=isMuted?0:(volume||.9);setDuration(el.duration||video.duration||0)}}} playsInline controlsList="nodownload noplaybackrate" className={`w-full h-full object-contain cursor-pointer ${hasStarted?'':'blur-2xl scale-105'}`}/>
  {!hasStarted&&<button aria-label="Play video" onClick={togglePlay} className="absolute inset-0 z-10 flex items-center justify-center bg-black/30"><span className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center"><Play className="w-7 h-7 fill-current"/></span></button>}
  <div className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100"><button onClick={()=>setUseBunnyIframeEmbed(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111]/90 text-[11px] text-amber-300 border border-amber-500/30"><Sparkles className="w-3.5 h-3.5"/> Bunny Stream Embed</button></div>
  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 sm:p-4 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
   <input aria-label="Video progress" type="range" min={0} max={duration||100} step={.1} value={Math.min(currentTime,duration||100)} onChange={handleSeek} className="w-full h-1.5 appearance-none bg-white/20 accent-amber-400 cursor-pointer"/>
   <div className="flex items-center justify-between text-white text-xs"><div className="flex items-center gap-2 sm:gap-3"><button aria-label={isPlaying?'Pause':'Play'} onClick={togglePlay} className="p-1.5 rounded-lg hover:bg-white/10">{isPlaying?<Pause className="w-5 h-5 fill-current"/>:<Play className="w-5 h-5 fill-current"/>}</button><button aria-label="Rewind 10 seconds" onClick={()=>seekRelative(-10)} className="p-1.5 rounded-lg hover:bg-white/10"><RotateCcw className="w-4 h-4"/></button><button aria-label={isMuted?'Unmute':'Mute'} onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/10">{isMuted||volume===0?<VolumeX className="w-4 h-4"/>:<Volume2 className="w-4 h-4"/>}</button><span className="font-mono text-[11px]">{formatTime(currentTime)} / {formatTime(duration)}</span></div><div className="flex items-center gap-1"><div className="relative"><button aria-label="Playback speed" onClick={()=>setShowSpeedMenu(v=>!v)} className="p-1.5 rounded-lg hover:bg-white/10"><Settings className="w-4 h-4"/></button>{showSpeedMenu&&<div className="absolute bottom-9 right-0 p-1 rounded-xl bg-[#111] border border-white/10 shadow-xl flex gap-1">{[.75,1,1.25,1.5,2].map(s=><button key={s} onClick={()=>setSpeed(s)} className={`px-2 py-1 rounded text-[10px] ${playbackSpeed===s?'bg-amber-500 text-black':'text-white hover:bg-white/10'}`}>{s}x</button>)}</div>}</div><button aria-label={isFullscreen?'Exit fullscreen':'Fullscreen'} onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/10">{isFullscreen?<Minimize className="w-5 h-5"/>:<Maximize className="w-5 h-5"/>}</button></div></div>
  </div>
 </div>;
};
