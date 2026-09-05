const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');

const targetStr = `                  </Link>
                )}

              </div>
            )}
          </div>`;

if (content.includes(targetStr)) {
  const replacement = `                  </Link>
                )}
                
                <div className="h-px bg-white/5 my-1" />
                <button
                  onClick={() => {
                    signOut();
                    setShowUserMenu(false);
                    navigate('/');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-white/5 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  Sign Out
                </button>
              </div>
            )}
          </div>`;
  content = content.replace(targetStr, replacement);
  fs.writeFileSync('src/components/layout/Navbar.tsx', content);
  console.log("Added Logout to Navbar");
} else {
  console.log("Could not find target string in Navbar");
}
