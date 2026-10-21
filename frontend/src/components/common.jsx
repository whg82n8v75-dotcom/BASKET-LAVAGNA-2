import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search } from "lucide-react";
import { makeView } from "@/lib/court";
import { drawScene } from "@/lib/render";
import { phaseScene } from "@/lib/engine";
import { CATEGORIES } from "@/lib/model";

export function PageShell({ title, back = "/", actions, children, testid }) {
  const navigate = useNavigate();
  return (
    <div data-testid={testid} className="min-h-[100dvh] bg-[#090D14] text-slate-100 pb-[max(24px,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-[#090D14]/85 backdrop-blur-xl border-b border-[#1E293B] pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-2">
          <button data-testid="page-back-btn" onClick={() => navigate(back)} className="w-10 h-10 -ml-1 grid place-items-center rounded-full hover:bg-[#1A263D]"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight flex-1 truncate">{title}</h1>
          <div className="flex items-center gap-1.5">{actions}</div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-5">{children}</main>
    </div>
  );
}

export function SearchInput({ value, onChange, autoFocus, testid = "search-input" }) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input data-testid={testid} autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Cerca schema per nome o descrizione…" className="w-full h-12 pl-10 pr-4 rounded-2xl bg-[#131C2E] border border-[#1E293B] text-base outline-none focus:border-amber-500 placeholder:text-slate-500" />
    </div>
  );
}

export function CategoryChips({ value, onChange, counts }) {
  const items = [["all", "Tutti"], ...Object.entries(CATEGORIES)];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1" data-testid="category-chips">
      {items.map(([k, l]) => (
        <button key={k} data-testid={`category-chip-${k}`} onClick={() => onChange(k)} className={`h-9 px-4 rounded-full text-sm font-semibold shrink-0 border transition-colors duration-150 ${value === k ? "bg-amber-500 text-[#090D14] border-amber-500" : "border-[#1E293B] text-slate-300 hover:bg-[#1A263D]"}`}>
          {l}{counts && <span className="ml-1.5 font-mono text-xs opacity-70">{counts[k] || 0}</span>}
        </button>
      ))}
    </div>
  );
}

export function PlayThumb({ play }) {
  const ref = useRef(null);
  const wrap = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  const h = Math.round(w * (play.courtMode === "full" ? 0.58 : 0.9));
  useEffect(() => {
    if (!w) return;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const c = ref.current;
      c.width = w * dpr;
      c.height = h * dpr;
      drawScene(c.getContext("2d"), makeView(w, h, play.courtMode, dpr), play, phaseScene(play, 0), { size: 0.75 });
    };
    draw();
    document.fonts?.ready.then(draw);
  }, [w, h, play]);
  return (
    <div ref={wrap} className="w-full bg-[#0B111C]">
      <canvas ref={ref} style={{ width: w, height: h }} className="block" />
    </div>
  );
}

export const filterPlays = (list, q, cat) => {
  const s = q.trim().toLowerCase();
  return list.filter((p) => (cat === "all" || p.category === cat) && (!s || `${p.name} ${p.description || ""} ${CATEGORIES[p.category] || ""}`.toLowerCase().includes(s)));
};

export const countByCat = (list) => list.reduce((acc, p) => ({ ...acc, all: (acc.all || 0) + 1, [p.category]: (acc[p.category] || 0) + 1 }), {});

export function CategoryBadge({ category }) {
  const colors = { attacco: "text-yellow-300 bg-yellow-400/10", difesa: "text-blue-300 bg-blue-500/10", rimesse: "text-emerald-300 bg-emerald-500/10", transizione: "text-orange-300 bg-orange-500/10" };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${colors[category] || "text-slate-300 bg-white/5"}`}>{CATEGORIES[category] || category}</span>;
}
