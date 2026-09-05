const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{ts,tsx}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('cornmm') || content.includes('Cornmm')) {
    content = content.replace(/cornmm/g, 'StreamSphere');
    content = content.replace(/Cornmm/g, 'StreamSphere');
    fs.writeFileSync(file, content);
  }
});
console.log('Replaced all StreamSphere mentions');
