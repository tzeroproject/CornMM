const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'creator_id: creatorId || "00000000-0000-0000-0000-000000000001"',
  'creator_id: (await supabaseAdmin.from("profiles").select("id").limit(1).then(r => r.data?.[0]?.id || null))'
);

fs.writeFileSync('server.ts', code);
console.log("Fixed server.ts");
