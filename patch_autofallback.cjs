const fs = require('fs');

let content = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

// 1. Remove state
content = content.replace(/\s*const \[autoFallback, setAutoFallback\] = useState\(true\);\n/g, '\n');

// 2. Remove the try-catch autoFallback block
const oldCatch = `      } catch (initErr: any) {
        if (!forceSimulated && autoFallback) {
          console.warn('Bunny API rejected credentials, using resilient fallback mode:', initErr);
          showToast({
            type: 'warning',
            title: 'Resilient Mode Activated',
            message: 'Bunny API rejected credentials. Video will be published in demo stream mode so you can watch immediately.',
          });
          bunnyInit = await initBunnyVideoUpload(title.trim(), true);
        } else {
          setBunnyError({
            message: initErr.message,
            guidance: initErr.guidance,
            statusCode: initErr.statusCode,
          });
          throw initErr;
        }
      }`;

const newCatch = `      } catch (initErr: any) {
        setBunnyError({
          message: initErr.message,
          guidance: initErr.guidance,
          statusCode: initErr.statusCode,
        });
        throw initErr;
      }`;

content = content.replace(oldCatch, newCatch);

// 3. Remove the UI checkbox
const oldUI = `            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoFallback}
                onChange={(e) => setAutoFallback(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-[#050505] border-white/20 focus:ring-amber-500"
              />
              <span className="text-xs text-zinc-300">
                <strong>Auto-Resilience (အလိုအလျောက် စမ်းသပ်မုဒ်):</strong> Bunny Stream ချိတ်ဆက်မှု အဆင်မပြေပါက Upload မပျက်သွားစေဘဲ အလိုအလျောက် တင်ပေးမည်။
              </span>
            </label>`;

content = content.replace(oldUI, '');

fs.writeFileSync('src/pages/UploadPage.tsx', content);
console.log("AutoFallback removed.");
