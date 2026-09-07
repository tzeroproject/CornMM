import fs from "node:fs";

const file = "src/pages/UploadPage.tsx";
let source = fs.readFileSync(file, "utf8");

source = source.replace(
  "const performUpload = async (forceSimulated: boolean = false) => {",
  "const performUpload = async () => {"
);

source = source.replace(
  "provider: 'bunny' | 'lulu' | 'simulated';",
  "provider: 'bunny' | 'lulu';"
);

source = source.replace(
  "const runBunnyUpload = async (simulated: boolean) => {\n        const bunnyInit = await initBunnyVideoUpload(title.trim(), simulated);",
  "const runBunnyUpload = async () => {\n        const bunnyInit = await initBunnyVideoUpload(title.trim(), false);"
);

const bunnyStart = source.indexOf("        const isSimulated = Boolean(bunnyInit.isSimulated || bunnyInit.videoId.startsWith('bny_'));\n        return {");
const bunnyEnd = source.indexOf("      const runLuluBackupUpload = async () => {", bunnyStart);
if (bunnyStart < 0 || bunnyEnd < 0) throw new Error("Bunny simulated block markers not found");

const bunnyReplacement = `        return {\n          provider: 'bunny' as const,\n          bunnyVideoId: bunnyInit.videoId,\n          videoUrl: getBunnyHlsUrl(bunnyInit.videoId, bunnyInit.cdnHostname),\n          thumbnailUrl: getBunnyThumbnailUrl(bunnyInit.videoId, bunnyInit.cdnHostname),\n          previewUrl: getBunnyPreviewUrl(bunnyInit.videoId, bunnyInit.cdnHostname),\n          duration: 180,\n        };\n      };\n\n`;
source = source.slice(0, bunnyStart) + bunnyReplacement + source.slice(bunnyEnd);

source = source.replace(
  "videoRecord = await runBunnyUpload(forceSimulated);",
  "videoRecord = await runBunnyUpload();"
);

const fallbackStart = source.indexOf("      } catch (bunnyErr: any) {");
const fallbackEnd = source.indexOf("\n      // Store video metadata in database", fallbackStart);
if (fallbackStart < 0 || fallbackEnd < 0) throw new Error("Fallback block markers not found");

const fallbackReplacement = `      } catch (bunnyErr: any) {\n        setBunnyError({\n          message: bunnyErr.message,\n          guidance: bunnyErr.guidance,\n          statusCode: bunnyErr.statusCode,\n        });\n\n        if (!autoFallback) throw bunnyErr;\n\n        console.warn('Bunny Stream failed, trying LuluStream backup host:', bunnyErr);\n        showToast({\n          type: 'warning',\n          title: 'Switching to Backup Host',\n          message: 'Bunny Stream is unavailable — uploading to the LuluStream backup instead.',\n        });\n\n        try {\n          videoRecord = await runLuluBackupUpload();\n        } catch (luluErr: any) {\n          console.error('Bunny Stream and LuluStream backup both failed:', luluErr);\n          throw luluErr;\n        }\n      }\n`;
source = source.slice(0, fallbackStart) + fallbackReplacement + source.slice(fallbackEnd);

source = source.replace(
  "      const successMessages: Record<typeof videoRecord.provider, string> = {\n        bunny: 'Your stream is live on Bunny CDN.',\n        lulu: 'Your stream is live on the LuluStream backup host.',\n        simulated: 'Video published and ready to watch.',\n      };",
  "      const successMessages: Record<typeof videoRecord.provider, string> = {\n        bunny: 'Your stream is live on Bunny CDN.',\n        lulu: 'Your stream is live on the LuluStream backup host.',\n      };"
);

source = source.replace(
  "onClick={() => performUpload(true)}",
  "onClick={() => performUpload()}"
);
source = source.replace(
  "Continue Upload in Prototype Mode (စမ်းသပ်မုဒ်ဖြင့် တိုက်ရိုက်တင်မည်)",
  "Retry Upload"
);

if (source.includes("using demo stream mode") || source.includes("performUpload(true)") || source.includes("provider: 'simulated'") || source.includes("isSimulated")) {
  throw new Error("Simulated mode references remain after patch");
}

fs.writeFileSync(file, source);
console.log("Simulated/demo upload mode removed from UploadPage build source");
