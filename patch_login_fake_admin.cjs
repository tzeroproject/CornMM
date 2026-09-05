const fs = require('fs');
let content = fs.readFileSync('src/pages/LoginPage.tsx', 'utf8');

// Replace isAdminCandidate logic
content = content.replace(/  const isAdminCandidate = identifier.trim\(\)\.toLowerCase\(\) === 'cadmin';\n/g, '');

content = content.replace(/  const fillAdminCredentials = \(\) => {\n    setIdentifier\('Cadmin'\);\n    setPassword\('Cadmin@123'\);\n  };\n/g, '');

content = content.replace(/            {isAdminCandidate && \([\s\S]*?\)}\n/g, '');

content = content.replace(/placeholder="Username \(e\.g\. Cadmin\) or email"/g, 'placeholder="Username or email"');

content = content.replace(/\{isLoading \? 'Signing In\.\.\.' : isAdminCandidate \? 'Sign In as Administrator' : 'Sign In'\}/g, "{isLoading ? 'Signing In...' : 'Sign In'}");

content = content.replace(/        if \(identifier\.trim\(\)\.toLowerCase\(\) === 'cadmin'\) {\n          navigate\('\/admin'\);\n        } else {\n          navigate\('\/'\);\n        }/g, "        navigate('/');");

fs.writeFileSync('src/pages/LoginPage.tsx', content);
console.log("Patched LoginPage.tsx");
