export function Header() {
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
