const fs = require('fs');
let content = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

const missingContent = `      )}

      {/* Trending Section */}
      {trendingVideos.length > 0 && selectedCategory === 'all' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-3 sm:px-0">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
              Trending Now
            </h2>
          </div>
          <VideoGrid
            videos={trendingVideos}
            isLoading={isLoading}
            onOpenReport={setReportVideo}
            onOpenShare={setShareVideo}
          />
        </section>
      )}

      {/* Latest / All Videos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-3 sm:px-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-500" />
            {selectedCategory === 'all' ? 'Latest Uploads' : 'Explore Category'}
          </h2>
        </div>
        <VideoGrid
          videos={latestVideos}
          isLoading={isLoading}
          onOpenReport={setReportVideo}
          onOpenShare={setShareVideo}
        />
      </section>

      {/* Modals */}`;

const replaceTarget = `      )}
      {/* Modals */}`;

if (content.includes(`      {/* Modals */}`)) {
  // It currently has a missing section. Let's fix.
  content = content.replace(`        </section>
      {/* Modals */}`, `        </section>\n` + missingContent);
  fs.writeFileSync('src/pages/HomePage.tsx', content);
  console.log("Restored missing sections!");
}
