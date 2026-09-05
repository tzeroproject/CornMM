const fs = require('fs');
let content = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

// The file has a broken block now. Let's find the `</section>` and the `{/* Modals */}` and remove everything between them.
const startStr = `      </section>`;
const endStr = `      {/* Modals */}`;

if (content.includes(startStr) && content.includes(endStr)) {
    const startIndex = content.indexOf(startStr) + startStr.length;
    const endIndex = content.indexOf(endStr);
    
    if (startIndex < endIndex) {
        content = content.substring(0, startIndex) + '\n\n' + content.substring(endIndex);
        fs.writeFileSync('src/pages/HomePage.tsx', content);
        console.log("Successfully removed the broken block.");
    }
}
