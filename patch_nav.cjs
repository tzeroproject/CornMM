const fs = require('fs');

let navbar = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');
navbar = navbar.replace('{user && isCreator && (', '{user && (');
fs.writeFileSync('src/components/layout/Navbar.tsx', navbar);
console.log("Navbar patched");

let sidebar = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
// Remove isCreator condition in the Sidebar for the Creator Studio menu
sidebar = sidebar.replace(/\{isCreator && \(/, '{user && (');
fs.writeFileSync('src/components/layout/Sidebar.tsx', sidebar);
console.log("Sidebar patched");
