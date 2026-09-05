const fs = require('fs');

let content = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

const targetContent = `      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleCategoryFilter('all')}
          className={\`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all \${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'bg-[#111111] border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white'
          }\`}
        >
          All Topics
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryFilter(cat.id)}
            className={\`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all \${
              selectedCategory === cat.id
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-[#111111] border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white'
            }\`}
          >
            {cat.name}
          </button>
        ))}
      </div>`;

if (content.includes(targetContent)) {
  content = content.replace(targetContent, '');
  fs.writeFileSync('src/pages/HomePage.tsx', content);
  console.log("Removed Category Pills Bar");
} else {
  console.log("Could not find exact text match");
}
