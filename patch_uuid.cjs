const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

content = content.replace(/id: 'admin-12345',/g, "id: '00000000-0000-0000-0000-000000000001',");

fs.writeFileSync('src/context/AuthContext.tsx', content);
console.log("Patched UUID");
