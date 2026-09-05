const fs = require('fs');
let content = fs.readFileSync('src/components/video/VideoPlayer.tsx', 'utf8');

const oldIframe = `<iframe
          src={embedSrc}
          loading="lazy"
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
        ></iframe>`;

const newIframe = `{hasStarted && (
          <iframe
            src={embedSrc}
            loading="lazy"
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
          ></iframe>
        )}`;

if (content.includes(oldIframe)) {
  content = content.replace(oldIframe, newIframe);
  fs.writeFileSync('src/components/video/VideoPlayer.tsx', content);
  console.log("VideoPlayer.tsx external iframe patched");
} else {
  console.log("Could not find exact iframe string");
}
