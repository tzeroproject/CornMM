const fs = require('fs');
let content = fs.readFileSync('src/components/video/VideoPlayer.tsx', 'utf8');

content = content.replace(
  'const [isPlaying, setIsPlaying] = useState(false);',
  'const [isPlaying, setIsPlaying] = useState(false);\n  const [hasStarted, setHasStarted] = useState(false);'
);

content = content.replace(
  'videoRef.current.play().then(() => setIsPlaying(true))',
  'videoRef.current.play().then(() => { setIsPlaying(true); setHasStarted(true); })'
);

content = content.replace(
  /className="w-full h-full object-contain cursor-pointer"/,
  'className={`w-full h-full object-contain cursor-pointer transition-all duration-700 ${!hasStarted ? "blur-2xl scale-105" : "blur-0 scale-100"}`}'
);

content = content.replace(
  /className="absolute inset-0 flex items-center justify-center bg-black\/40 backdrop-blur-\[1px\] cursor-pointer"/,
  'className={`absolute inset-0 flex items-center justify-center bg-black/40 ${!hasStarted ? "backdrop-blur-2xl" : "backdrop-blur-[1px]"} cursor-pointer transition-all duration-700`}'
);

fs.writeFileSync('src/components/video/VideoPlayer.tsx', content);
console.log("VideoPlayer.tsx patched for blur");
