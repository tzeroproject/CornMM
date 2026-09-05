const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Remove the require statements
content = content.replace("const multer = require('multer');", "");
content = content.replace("const FormData = require('form-data');", "");
content = content.replace("const upload = multer({ dest: '/tmp/uploads/' });", "");

content = content.replace(/require\('fs'\)\./g, 'fs.');

// Add imports at the top
const imports = `import express from "express";
import multer from "multer";
import FormData from "form-data";
import fs from "fs";
const upload = multer({ dest: '/tmp/uploads/' });
`;
content = content.replace('import express from "express";', imports);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts for ES Modules");
