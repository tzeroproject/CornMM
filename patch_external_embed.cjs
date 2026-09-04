const fs = require('fs');

// 1. Patch VideoPlayer.tsx
let videoPlayerCode = fs.readFileSync('src/components/video/VideoPlayer.tsx', 'utf8');
const externalEmbedCheck = `
  const isExternalEmbed = video.video_url && !video.video_url.includes('.m3u8') && (video.video_url.includes('http') || video.video_url.startsWith('//')) && (!video.bunny_video_id || video.bunny_video_id === 'embed');

  if (isExternalEmbed) {
    // Attempt to extract src if the user pasted a full iframe tag
    let embedSrc = video.video_url;
    const srcMatch = video.video_url.match(/src=["'](.*?)["']/);
    if (srcMatch && srcMatch[1]) {
      embedSrc = srcMatch[1];
    }

    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <iframe
          src={embedSrc}
          loading="lazy"
          className="w-full h-full border-0"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen
          title={video.title}
        />
      </div>
    );
  }

  // If user chooses Bunny Direct Iframe Player Mode
`;

videoPlayerCode = videoPlayerCode.replace(
  '// If user chooses Bunny Direct Iframe Player Mode',
  externalEmbedCheck
);
fs.writeFileSync('src/components/video/VideoPlayer.tsx', videoPlayerCode);
console.log("Patched VideoPlayer.tsx");
