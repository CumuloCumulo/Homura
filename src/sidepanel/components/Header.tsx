// Dashboard icon
const DashboardIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

export function Header() {
  const handleOpenDashboard = () => {
    // Open dashboard in a new tab
    const dashboardUrl = chrome.runtime.getURL('src/dashboard/index.html');
    chrome.tabs.create({ url: dashboardUrl });
  };

  return (
    <header className="px-3 py-2.5 border-b border-white/5 bg-zinc-900/80 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        {/* Logo - Minimal geometric */}
        <div className="relative w-7 h-7 rounded-md bg-gradient-to-br from-violet-600/80 to-fuchsia-600/80 flex items-center justify-center shadow-neon">
          <span className="text-white font-bold text-xs tracking-tight">H</span>
          {/* Breathing indicator */}
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-breathing" />
        </div>
        
        {/* Title - Compact */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">Homura</h1>
          <p className="text-[10px] text-zinc-500 truncate">AI Automation Agent</p>
        </div>

        {/* Open Dashboard Button */}
        <button
          onClick={handleOpenDashboard}
          className="
            shrink-0 w-7 h-7 rounded-md flex items-center justify-center
            bg-zinc-800/80 text-zinc-400 border border-white/5
            hover:bg-zinc-700 hover:text-violet-400 hover:border-violet-500/30
            transition-all duration-200
          "
          title="打开 Dashboard"
        >
          <DashboardIcon />
        </button>
        
        {/* Status badge - Ultra minimal */}
        <div className="shrink-0">
          <span className="px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
            dev
          </span>
        </div>
      </div>
    </header>
  );
}
