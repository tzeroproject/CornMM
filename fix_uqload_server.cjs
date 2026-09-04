const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf8');
serverTs = serverTs.replace('https://uqloadstream.com', 'https://uqload.vc');
fs.writeFileSync('server.ts', serverTs);

let uploadPage = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');
uploadPage = uploadPage.replace(/uqloadstream\.com/g, 'uqload.vc');
uploadPage = uploadPage.replace(/uqload\.vc\/e\//g, 'uqload.vc/e/');
fs.writeFileSync('src/pages/UploadPage.tsx', uploadPage);
