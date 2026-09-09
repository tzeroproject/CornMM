import fs from 'node:fs';

const uploadPath = 'src/pages/UploadPage.tsx';
const serverPath = 'server-entry.ts';

function patchOnce(path, marker, patcher) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(marker)) return false;
  const updated = patcher(source);
  if (updated === source) throw new Error(`Could not patch ${path}`);
  fs.writeFileSync(path, updated);
  return true;
}

patchOnce(uploadPath, "type UploadMode = 'uqload' | 'doodstream' | 'filemoon' | 'streamtape' | 'filemoon-link' | 'embed';", (source) => {
  let out = source.replace(
    "type UploadMode = 'uqload' | 'doodstream' | 'filemoon' | 'streamtape' | 'embed';",
    "type UploadMode = 'uqload' | 'doodstream' | 'filemoon' | 'streamtape' | 'filemoon-link' | 'embed';"
  );
  out = out.replace(
    "const isAnyEmbed = uploadMode === 'embed'; if (isAnyEmbed ? !embedInput.trim() : !selectedFile)",
    "const isAnyEmbed = uploadMode === 'embed'; const isFileMoonLink = uploadMode === 'filemoon-link'; if (isAnyEmbed || isFileMoonLink ? !embedInput.trim() : !selectedFile)"
  );
  out = out.replace(
    "setError(isAnyEmbed ? 'Please enter an embed URL or iframe code.' : 'Please select a video file.');",
    "setError(isAnyEmbed ? 'Please enter an embed URL or iframe code.' : isFileMoonLink ? 'Please enter a FileMoon file link.' : 'Please select a video file.');"
  );
  out = out.replace(
    "if (isAnyEmbed) { videoUrl = getEmbedSource(embedInput); providerId = videoUrl; }\n      else if (uploadMode === 'streamtape')",
    "if (isAnyEmbed) { videoUrl = getEmbedSource(embedInput); providerId = videoUrl; }\n      else if (isFileMoonLink) { const response = await fetch('/api/filemoon/import-link', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify({ url:embedInput.trim(), title:title.trim(), description:description.trim(), category_id:categoryId }) }); const result = await response.json().catch(()=>({})); if (!response.ok) throw new Error(formatUploadError(result, 'FileMoon', response.status)); providerId = String(result.fileId || result.providerId || ''); if (!providerId) throw new Error('FileMoon link did not return a file ID.'); videoUrl = String(result.embedUrl || result.videoUrl || `https://filemoon.org/${encodeURIComponent(providerId)}/embed`); thumbnailUrl = String(result.thumbnailUrl || ''); serverVideoId = String(result.videoId || ''); if (!serverVideoId) throw new Error('FileMoon link imported, but Supabase video record was not created.'); }\n      else if (uploadMode === 'streamtape')"
  );
  out = out.replace(
    "{(['uqload','doodstream','filemoon','streamtape','embed'] as UploadMode[]).map((mode)",
    "{(['uqload','doodstream','filemoon','streamtape','filemoon-link','embed'] as UploadMode[]).map((mode)"
  );
  out = out.replace(
    "mode === 'filemoon' ? 'FileMoon' : mode === 'streamtape' ? 'Streamtape' : 'Any Embed Link'",
    "mode === 'filemoon' ? 'FileMoon Upload' : mode === 'filemoon-link' ? 'FileMoon Link' : mode === 'streamtape' ? 'Streamtape' : 'Any Embed Link'"
  );
  out = out.replace(
    "{mode === 'uqload' ? 'UQLOAD' : mode === 'doodstream' ? 'DoodStream' : mode === 'filemoon' ? 'FileMoon' : mode === 'streamtape' ? 'Streamtape' : 'Any Embed Link'}",
    "{mode === 'uqload' ? 'UQLOAD' : mode === 'doodstream' ? 'DoodStream' : mode === 'filemoon' ? 'FileMoon Upload' : mode === 'filemoon-link' ? 'FileMoon Link' : mode === 'streamtape' ? 'Streamtape' : 'Any Embed Link'}"
  );
  out = out.replace(
    "const providerLabel = uploadMode === 'streamtape' ? 'Streamtape' : uploadMode === 'filemoon' ? 'FileMoon' : uploadMode === 'doodstream' ? 'DoodStream' : uploadMode === 'uqload' ? 'UQLOAD' : 'Any Embed Link';",
    "const providerLabel = uploadMode === 'streamtape' ? 'Streamtape' : uploadMode === 'filemoon' ? 'FileMoon' : uploadMode === 'filemoon-link' ? 'FileMoon Link' : uploadMode === 'doodstream' ? 'DoodStream' : uploadMode === 'uqload' ? 'UQLOAD' : 'Any Embed Link';"
  );
  out = out.replace(
    "{uploadMode === 'embed' ? <div className=\"p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-3\"><label className=\"block text-sm font-bold text-white\">Any Embed Link</label><p className=\"text-xs text-zinc-400\">Paste an external iframe embed URL or full iframe code. It will use its own isolated embed player.</p><textarea value={embedInput}",
    "{uploadMode === 'embed' || uploadMode === 'filemoon-link' ? <div className=\"p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-3\"><label className=\"block text-sm font-bold text-white\">{uploadMode === 'filemoon-link' ? 'FileMoon File Link' : 'Any Embed Link'}</label><p className=\"text-xs text-zinc-400\">{uploadMode === 'filemoon-link' ? 'Paste a FileMoon file link such as https://filemoon.org/en/Pbe3PWjLmlX6/file. It will be imported and saved to Supabase.' : 'Paste an external iframe embed URL or full iframe code. It will use its own isolated embed player.'}</p><textarea value={embedInput}"
  );
  out = out.replace(
    "placeholder={'https://example.com/embed/abc123 or <iframe src=\"...\"></iframe>'}",
    "placeholder={uploadMode === 'filemoon-link' ? 'https://filemoon.org/en/Pbe3PWjLmlX6/file' : 'https://example.com/embed/abc123 or <iframe src=\"...\"></iframe>'}"
  );
  out = out.replace(
    "{uploadMode === 'embed' ? 'Add Embed Link' : `Upload to ${providerLabel}`}",
    "{uploadMode === 'embed' ? 'Add Embed Link' : uploadMode === 'filemoon-link' ? 'Import FileMoon Link' : `Upload to ${providerLabel}`}"
  );
  return out;
});

patchOnce(serverPath, '// CORNMM_FILEMOON_LINK_IMPORT_ROUTE', (source) => {
  const marker = '  // CORNMM_FILEMOON_LINK_IMPORT_ROUTE\n';
  const route = `${marker}  this.post('/api/filemoon/import-link', express.json(), async (req: any, res: any) => {\n    try {\n      if (!(await requireAdmin(req, res))) return;\n      const token = String(process.env.FILEMOON_API_TOKEN || '').trim();\n      if (!token) return res.status(500).json({ error: 'FileMoon is not configured. Set FILEMOON_API_TOKEN on Railway.' });\n      const input = String(req.body?.url || '').trim();\n      const match = input.match(/^https?:\\/\\/(?:www\\.)?filemoon\\.org\\/(?:[a-z]{2}\\/)?([^/?#]+)\\/file(?:[/?#].*)?$/i);\n      if (!match) return res.status(400).json({ error: 'Invalid FileMoon file link. Example: https://filemoon.org/en/Pbe3PWjLmlX6/file' });\n      const fileId = match[1];\n      const response = await fetch(\`https://filemoon.org/api/v1/files/\${encodeURIComponent(fileId)}\`, { headers: { Authorization: \`Bearer \${token}\`, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });\n      const body = await response.text();\n      let payload: any = {}; try { payload = JSON.parse(body); } catch { payload = { raw: body }; }\n      if (!response.ok) return res.status(502).json({ error: String(payload?.error?.message || payload?.error || payload?.message || 'FileMoon file lookup failed'), upstreamStatus: response.status, requestId: response.headers.get('x-request-id'), details: payload });\n      const file = payload?.data || payload?.file || payload || {};\n      const resolvedId = String(file?.id || fileId).trim();\n      const embedUrl = String(file?.urls?.embed || \`https://filemoon.org/\${encodeURIComponent(resolvedId)}/embed\`);\n      const watchUrl = String(file?.urls?.watch || \`https://filemoon.org/\${encodeURIComponent(resolvedId)}/watch\`);\n      const pageUrl = String(file?.urls?.page || input);\n      const thumbnailUrl = String(file?.thumbnail_url || file?.thumbnail || '');\n      if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase server configuration missing', fileId: resolvedId });\n      const user = await getAuthenticatedUser(req);\n      const title = String(req.body?.title || file?.name || file?.filename || \`FileMoon \${resolvedId}\`).replace(/\\.[^.]+$/, '').trim();\n      const description = String(req.body?.description || file?.description || '').trim();\n      const categoryId = String(req.body?.category_id || '').trim() || null;\n      const { data: existing } = await supabaseAdmin.from('videos').select('id').eq('provider','filemoon').eq('provider_id',resolvedId).maybeSingle();\n      let videoId = existing?.id || null;\n      const values = { title, description, category_id: categoryId, visibility:'public', moderation_status:'published', video_url:embedUrl || watchUrl || pageUrl, thumbnail_url:thumbnailUrl, provider:'filemoon', provider_id:resolvedId, is_published:true, updated_at:new Date().toISOString() };\n      if (videoId) { const { error } = await supabaseAdmin.from('videos').update(values).eq('id', videoId); if (error) throw error; }\n      else { const { data: created, error } = await supabaseAdmin.from('videos').insert({ ...values, slug:makeSlug(title,resolvedId), creator_id:user?.id || null }).select('id').single(); if (error) throw error; videoId = created?.id || null; }\n      return res.json({ success:true, provider:'filemoon', fileId:resolvedId, providerId:resolvedId, pageUrl, embedUrl, watchUrl, videoUrl:embedUrl || watchUrl || pageUrl, thumbnailUrl, videoId, savedToSupabase:true });\n    } catch (e:any) { console.error('[FileMoon] link import failed:', e); return res.status(502).json({ error:e?.message || 'FileMoon link import failed' }); }\n  });\n\n`;
  const target = "  this.post('/api/filemoon/sync'";
  const index = source.indexOf(target);
  if (index < 0) throw new Error('FileMoon sync route not found');
  return source.slice(0, index) + route + source.slice(index);
});

console.log('[CornMM] FileMoon link import patch applied.');
