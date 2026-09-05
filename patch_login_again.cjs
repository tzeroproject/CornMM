const fs = require('fs');
let content = fs.readFileSync('src/pages/LoginPage.tsx', 'utf8');

const replacement = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const ok = await signIn(identifier, password);
      if (ok) {
        if (identifier.trim().toLowerCase() === 'cadmin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Sign In Failed', message: err.message || 'Invalid credentials' });
    } finally {
      setIsLoading(false);
    }
  };`;

content = content.replace(/  const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?  \};\n/, replacement + '\n');
fs.writeFileSync('src/pages/LoginPage.tsx', content);
console.log("Patched LoginPage again");
