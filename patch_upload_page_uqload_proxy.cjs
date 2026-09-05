const fs = require('fs');
let content = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

const targetStr = `      if (uploadMode === 'uqload' && selectedFile) {
        setUploadStep('authorizing');
        const res = await fetch('/api/uqload/upload-server');
        if (!res.ok) throw new Error('Failed to fetch Uqload configuration');
        const config = await res.json();
        if (config.error) throw new Error(config.error);
        
        setUploadStep('uploading');
        setUploadProgress(10);
        
        const formData = new FormData();
        formData.append('key', config.apiKey);
        formData.append('file', selectedFile);
        formData.append('file_title', title.trim());
        formData.append('html_redirect', '0');
        
        const result = await new Promise<any>((resolve, reject) => {
           const xhr = new XMLHttpRequest();
           xhr.open('POST', config.uploadUrl);
           xhr.upload.onprogress = (e) => {
             if (e.lengthComputable) {
               const p = Math.round((e.loaded / e.total) * 90);
               setUploadProgress(10 + p);
             }
           };
           xhr.onload = () => {
             if (xhr.status === 200) {
               try {
                 resolve(JSON.parse(xhr.responseText));
               } catch (err) {
                 reject(new Error('Invalid JSON from Uqload'));
               }
             } else {
               reject(new Error('Uqload upload failed with status ' + xhr.status));
             }
           };
           xhr.onerror = () => reject(new Error('Uqload upload network error'));
           xhr.send(formData);
        });
        
        if (!result || !result.files || !result.files[0] || !result.files[0].filecode) {
           throw new Error('Uqload upload failed or returned invalid format');
        }
        
        const filecode = result.files[0].filecode;
        const finalEmbedUrl = \`https://uqload.vc/e/\${filecode}\`;
        
        setUploadStep('done');`;

const repStr = `      if (uploadMode === 'uqload' && selectedFile) {
        setUploadStep('uploading');
        setUploadProgress(10);
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('file_title', title.trim());
        
        const result = await new Promise<any>((resolve, reject) => {
           const xhr = new XMLHttpRequest();
           xhr.open('POST', '/api/uqload/proxy-upload');
           xhr.upload.onprogress = (e) => {
             if (e.lengthComputable) {
               const p = Math.round((e.loaded / e.total) * 90);
               setUploadProgress(10 + p);
             }
           };
           xhr.onload = () => {
             if (xhr.status === 200) {
               try {
                 resolve(JSON.parse(xhr.responseText));
               } catch (err) {
                 reject(new Error('Invalid JSON from server'));
               }
             } else {
               try {
                 const errJson = JSON.parse(xhr.responseText);
                 reject(new Error(errJson.error || 'Server upload failed'));
               } catch {
                 reject(new Error('Server upload failed with status ' + xhr.status));
               }
             }
           };
           xhr.onerror = () => reject(new Error('Proxy upload network error'));
           xhr.send(formData);
        });
        
        if (!result || !result.files || !result.files[0] || !result.files[0].filecode) {
           throw new Error('Uqload upload failed or returned invalid format');
        }
        
        const filecode = result.files[0].filecode;
        const finalEmbedUrl = \`https://uqload.vc/e/\${filecode}\`;
        
        setUploadStep('done');`;

content = content.replace(targetStr, repStr);
fs.writeFileSync('src/pages/UploadPage.tsx', content);
console.log("Patched UploadPage.tsx");
