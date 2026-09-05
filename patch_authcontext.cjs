const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');
content = content.replace(
  "isAdmin: user?.role === 'admin' || user?.role === 'moderator',",
  "isAdmin: Boolean(user?.role === 'admin' || user?.role === 'moderator'),"
);
fs.writeFileSync('src/context/AuthContext.tsx', content);
console.log("AuthContext patched");
