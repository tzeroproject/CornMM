const fs = require('fs');
let content = fs.readFileSync('src/components/video/VideoPlayer.tsx', 'utf8');

// For isExternalEmbed block
const externalEmbedBlock = `  if (isExternalEmbed) {
    // Attempt to extract src if the user pasted a full iframe tag
    let embedSrc = video.video_url;
    const srcMatch = video.video_url.match(/src\\s*=\\s*["'](.*?)["']/i);
    if (srcMatch && srcMatch[1]) {
      embedSrc = srcMatch[1];
    }

    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        {!hasStarted && (
          <div 
            className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer overflow-hidden"
            onClick={() => setHasStarted(true)}
          >
            <img src={video.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <div className="z-20 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-amber-500 hover:text-black hover:border-transparent transition-all duration-300">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
          </div>
        )}
        <iframe
          src={embedSrc}
          loading="lazy"
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
        ></iframe>
      </div>
    );
  }`;

content = content.replace(/if \(isExternalEmbed\) \{[\s\S]*?<\/div>\s*\);\s*\}/, externalEmbedBlock);

// For BunnyIframeEmbed block
const bunnyIframeEmbedBlock = `  if (useBunnyIframeEmbed && video.bunny_video_id) {
    const iframeSrc = getBunnyIframeUrl({
      videoId: video.bunny_video_id,
      autoplay: hasStarted,
    });

    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        {!hasStarted && (
          <div 
            className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer overflow-hidden"
            onClick={() => setHasStarted(true)}
          >
            <img src={video.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <div className="z-20 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-amber-500 hover:text-black hover:border-transparent transition-all duration-300">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
          </div>
        )}
        {hasStarted && (
          <iframe
            src={iframeSrc}
            loading="lazy"
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
          ></iframe>
        )}
      </div>
    );
  }`;

content = content.replace(/if \(useBunnyIframeEmbed && video\.bunny_video_id\) \{[\s\S]*?<\/div>\s*\);\s*\}/, bunnyIframeEmbedBlock);

fs.writeFileSync('src/components/video/VideoPlayer.tsx', content);
console.log("VideoPlayer.tsx iframe logic patched for blur");
