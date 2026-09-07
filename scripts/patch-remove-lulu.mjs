import fs from "node:fs";

const frontendFile = "src/pages/UploadPage.tsx";
let source = fs.readFileSync(frontendFile, "utf8");

source = source.replace(/import \{ uploadToLulu \} from ['\"]\.\.\/lib\/lulu['\"];\n/g, "");
source = source.replace(/setUploadMode\('bunny'\);\n    }/g, "setUploadMode('bunny');\n    }");
source = source.replace(/\"bunny\" \| \"lulu\" \| \"uqload\" \| \"good\"/g, "\"bunny\" | \"uqload\" | \"good\"");
source = source.replace(/\"bunny\" \| \"lulu\" \| \"uqload\"/g, "\"bunny\" | \"uqload\"");

source = source.replace(/\n\s*if \(uploadMode === 'lulu'\) \{\n\s*setUploadMode\('bunny'\);\n\s*\}/g, "");
source = source.replace(/\n\s*if \(uploadMode === 'lulu' && !selectedFile\) \{[\s\S]*?\n\s*\}\n/g, "\n");
source = source.replace(/\n\s*if \(uploadMode === 'lulu' && selectedFile\) \{[\s\S]*?\n\s*\}\n\n\s*if \(uploadMode === 'uqload'/, "\n\n      if (uploadMode === 'uqload'");
source = source.replace(/\n\s*const runLuluBackupUpload = async \(\) => \{[\s\S]*?\n\s*\};\n/g, "\n");

const fallbackStart = source.indexOf("      } catch (bunnyErr: any) {");
const fallbackEnd = source.indexOf("\n      // Store video metadata in database", fallbackStart);
if (fallbackStart >= 0 && fallbackEnd >= 0) {
  source = source.slice(0, fallbackStart) + `      } catch (bunnyErr: any) {\n        setBunnyError({\n          message: bunnyErr.message,\n          guidance: bunnyErr.guidance,\n          statusCode: bunnyErr.statusCode,\n        });\n        throw bunnyErr;\n      }\n` + source.slice(fallbackEnd);
}

source = source.replace(/\n\s*lulu: ['\"][^'\"]*['\"],?/g, "");
source = source.replace(/\n\s*message: ['\"]Bunny Stream is unavailable[^\n]*\n/g, "");

if (/uploadToLulu|uploadMode === ['\"]lulu['\"]|LuluStream|luluResult|provider: ['\"]lulu['\"]/.test(source)) {
  throw new Error("LuluStream references remain in UploadPage.tsx after patch");
}
fs.writeFileSync(frontendFile, source);

const serverFile = "server.ts";
let server = fs.readFileSync(serverFile, "utf8");
server = server.replace(/, lulu: Boolean\(String\(process\.env\.LULU_API_KEY \|\| ['\"]['\"]\)\.trim\(\)\)/, "");
server = server.replace(/\n?async function handleLuluUpload\([\s\S]*?(?=\napp\.post\("\/api\/uqload\/proxy-upload")/m, "\n");
server = server.replace(/\n?app\.post\("\/api\/lulu\/upload"[\s\S]*?(?=\napp\.post\("\/api\/uqload\/proxy-upload")/m, "\n");
if (/\/api\/lulu\/upload|handleLuluUpload|LULU_API_KEY/.test(server)) {
  throw new Error("LuluStream references remain in server.ts after patch");
}
fs.writeFileSync(serverFile, server);

console.log("LuluStream integration removed from frontend and API build source");
