const fs = require('fs');
let code = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

const oldGoodEmbedLogic = `      if (uploadMode === 'lulu' || uploadMode === 'good') {
        setUploadStep('done');
        let finalEmbedUrl = embedUrl;
        const srcMatch = embedUrl.match(/src=["'](.*?)["']/);
        if (srcMatch && srcMatch[1]) {
          finalEmbedUrl = srcMatch[1];
        }

        await videoService.createVideo({
          title,
          description,
          category_id: categoryId,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          visibility,
          is_age_restricted: isAgeRestricted,
          allow_comments: allowComments,
          creator_id: user?.id,
          // Generic embed setup
          bunny_video_id: 'embed',
          video_url: finalEmbedUrl,
          playback_url: finalEmbedUrl,
          thumbnail_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          duration: 0,
          moderation_status: 'published' // Auto publish for embeds since it's admin/external
        });
        
        showToast({ type: 'success', title: 'Embed Successful', message: 'Your video embed was published.' });
        navigate('/');
        return;
      }`;


const luluUploadLogic = `
      if (uploadMode === 'lulu' && selectedFile) {
        try {
          setUploadStep('authorizing');
          const res = await fetch('/api/lulu/upload-server');
          if (!res.ok) throw new Error('Failed to fetch Lulu configuration');
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
                   reject(new Error('Invalid JSON from Lulu'));
                 }
               } else {
                 reject(new Error('Lulu upload failed with status ' + xhr.status));
               }
             };
             xhr.onerror = () => reject(new Error('Lulu upload network error'));
             xhr.send(formData);
          });
          
          if (!result || !result.files || !result.files[0] || !result.files[0].filecode) {
             throw new Error('Lulu upload failed or returned invalid format');
          }
          
          const filecode = result.files[0].filecode;
          const finalEmbedUrl = \`https://lulustream.com/e/\${filecode}\`;
          
          setUploadStep('done');
          
          await videoService.createVideo({
            title: title.trim(),
            description: description.trim(),
            category_id: categoryId,
            tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
            visibility,
            is_age_restricted: isAgeRestricted,
            allow_comments: allowComments,
            creator_id: user?.id,
            bunny_video_id: 'embed',
            video_url: finalEmbedUrl,
            playback_url: finalEmbedUrl,
            thumbnail_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
            duration: 0,
            moderation_status: 'published'
          });
          
          showToast({ type: 'success', title: 'Upload Successful', message: 'Your video is now on Lulu Stream.' });
          navigate('/');
          return;
          
        } catch (e: any) {
           showToast({ type: 'error', title: 'Lulu Upload Failed', message: e.message });
           setIsUploading(false);
           return;
        }
      }

      if (uploadMode === 'good') {
        setUploadStep('done');
        let finalEmbedUrl = embedUrl;
        const srcMatch = embedUrl.match(/src=["'](.*?)["']/);
        if (srcMatch && srcMatch[1]) {
          finalEmbedUrl = srcMatch[1];
        }

        await videoService.createVideo({
          title,
          description,
          category_id: categoryId,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          visibility,
          is_age_restricted: isAgeRestricted,
          allow_comments: allowComments,
          creator_id: user?.id,
          // Generic embed setup
          bunny_video_id: 'embed',
          video_url: finalEmbedUrl,
          playback_url: finalEmbedUrl,
          thumbnail_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          duration: 0,
          moderation_status: 'published' // Auto publish for embeds since it's admin/external
        });
        
        showToast({ type: 'success', title: 'Embed Successful', message: 'Your video embed was published.' });
        navigate('/');
        return;
      }
`;

code = code.replace(oldGoodEmbedLogic, luluUploadLogic);

fs.writeFileSync('src/pages/UploadPage.tsx', code);
console.log("Patched Logic for Lulu upload");
