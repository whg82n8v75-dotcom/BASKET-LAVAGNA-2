import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderOpen, BookOpen, Search, Settings, WifiOff, Wifi, ArrowUpRight } from "lucide-react";
import { usePlays } from "@/lib/store";
import { getPresets } from "@/lib/presets";
import { NewPlayDialog } from "@/components/NewPlayDialog";
import { PlayThumb, CategoryBadge } from "@/components/common";

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener("online", a);
    window.addEventListener("offline", b);
    return () => {
      window.removeEventListener("online", a);
      window.removeEventListener("offline", b);
    };
  }, []);
  return on;
}

function Tile({ icon: Icon, title, sub, onClick, testid, delay }) {
  return (
    <button data-testid={testid} onClick={onClick} style={{ animationDelay: `${delay}ms` }} className="group text-left rounded-2xl bg-[#131C2E] border border-[#1E293B] p-4 sm:p-5 hover:bg-[#1A263D] hover:border-[#334155] transition-colors duration-200 animate-in fade-in slide-in-from-bottom-3 fill-mode-both">
      <div className="flex items-start justify-between">
        <Icon className="w-6 h-6 text-amber-400" />
        <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
      </div>
      <div className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-tight mt-6">{title}</div>
      <div className="text-xs sm:text-sm text-slate-400 mt-1">{sub}</div>
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { plays } = usePlays();
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState("");
  const online = useOnline();
  const recent = [...plays].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 4);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone;

  return (
    <div data-testid="home-page" className="min-h-[100dvh] bg-[#090D14] text-slate-100 pt-[env(safe-area-inset-top)] pb-[max(24px,env(safe-area-inset-bottom))] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(90deg,#E5C396 0 2px,transparent 2px 48px)" }} />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-xl" />
            <span className="font-heading font-extrabold uppercase tracking-tight text-lg">BTM</span>
          </div>
          <span data-testid="online-status" className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border ${online ? "border-emerald-900 text-emerald-400" : "border-amber-900 text-amber-400"}`}>
            {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}{online ? "Online" : "Offline: tutto funziona"}
          </span>
        </div>

        <section className="pt-8 sm:pt-14 pb-8 max-w-3xl">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-amber-400 animate-in fade-in duration-500">Lavagna tattica animata</div>
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.9] mt-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Basket Tactics <span className="text-amber-400">Motion</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-4 max-w-xl">Disegna lo schema, crea le fasi e premi Play: i giocatori si muovono da soli. Funziona offline, salva tutto sul dispositivo.</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <button data-testid="home-new-play-btn" onClick={() => setNewOpen(true)} className="h-14 px-7 rounded-full bg-amber-500 text-[#090D14] font-bold text-base flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors duration-200 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
              <Plus className="w-5 h-5" />Nuovo schema
            </button>
            <form className="flex-1 max-w-md relative" onSubmit={(e) => { e.preventDefault(); navigate(`/cerca?q=${encodeURIComponent(q)}`); }}>
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input data-testid="home-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca schema…" className="w-full h-14 pl-11 pr-4 rounded-full bg-[#131C2E] border border-[#1E293B] text-base outline-none focus:border-amber-500" />
            </form>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile testid="home-my-plays-tile" icon={FolderOpen} title="I miei schemi" sub={`${plays.length} salvati sul dispositivo`} onClick={() => navigate("/schemi")} delay={50} />
          <Tile testid="home-library-tile" icon={BookOpen} title="Libreria" sub={`${getPresets().length} schemi pronti da modificare`} onClick={() => navigate("/libreria")} delay={120} />
          <Tile testid="home-search-tile" icon={Search} title="Cerca" sub="Nei tuoi schemi e in libreria" onClick={() => navigate("/cerca")} delay={190} />
          <Tile testid="home-settings-tile" icon={Settings} title="Impostazioni" sub={standalone ? "App installata" : "Installa sulla Home"} onClick={() => navigate("/impostazioni")} delay={260} />
        </section>

        {recent.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between mb-3">
              <h2 className="font-heading text-xl font-bold uppercase tracking-tight">Recenti</h2>
              <button data-testid="home-see-all" onClick={() => navigate("/schemi")} className="text-sm text-amber-400 font-semibold">Vedi tutti</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recent.map((p) => (
                <button key={p.id} data-testid={`recent-play-${p.id}`} onClick={() => navigate(`/editor/${p.id}`)} className="text-left rounded-2xl overflow-hidden bg-[#131C2E] border border-[#1E293B] hover:border-[#334155] transition-colors">
                  <PlayThumb play={p} />
                  <div className="p-3">
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    <div className="mt-1.5 flex items-center gap-2"><CategoryBadge category={p.category} /><span className="font-mono text-[10px] text-slate-500">{p.phases.length} fasi</span></div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      <NewPlayDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
