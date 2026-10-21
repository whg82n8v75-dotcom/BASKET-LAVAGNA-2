import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { makeView } from "@/lib/court";
import { drawScene } from "@/lib/render";
import { buildTimeline, frameAt } from "@/lib/engine";
import { generateDefense, STRATEGIES, DEFAULT_DEFENSE } from "@/lib/defense";

const OPTIONS = { ...Object.fromEntries(Object.entries(STRATEGIES).map(([k, l]) => [`man:${k}`, `Uomo · ${l}`])), zone23: "Zona 2-3", zone32: "Zona 3-2" };

function variant(play, key) {
  const base = { ...DEFAULT_DEFENSE, ...(play.defense || {}), params: { ...DEFAULT_DEFENSE.params, ...(play.defense?.params || {}) } };
  const cfg = key.startsWith("man:") ? { ...base, mode: "man", strategy: key.slice(4), arrows: true } : { ...base, mode: key, arrows: true };
  const clean = { ...play, phases: play.phases.map((ph) => ({ ...ph, locked: {} })) };
  return generateDefense(clean, cfg).play;
}

const Pane = forwardRef(function Pane({ play, testid }, ref) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState(0);
  const tl = useMemo(() => buildTimeline(play), [play]);
  const view = useMemo(() => (size.w > 10 ? makeView(size.w, size.h, play.courtMode, Math.min(2, window.devicePixelRatio || 1)) : null), [size, play.courtMode]);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  const draw = (T) => {
    const c = canvas.current;
    if (!view || !c) return;
    if (c.width !== Math.round(view.w * view.dpr)) {
      c.width = Math.round(view.w * view.dpr);
      c.height = Math.round(view.h * view.dpr);
    }
    const fr = frameAt(play, tl, Math.min(T, tl.total - 1e-4), true);
    drawScene(c.getContext("2d"), view, play, fr, { size: 0.9 });
    if (fr.phaseIndex !== phase) setPhase(fr.phaseIndex);
  };
  useImperativeHandle(ref, () => ({ draw, total: tl.total }));
  useEffect(() => draw(0), [view, play]); // eslint-disable-line react-hooks/exhaustive-deps
  const info = play.phases[phase]?.defInfo;
  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-2" data-testid={testid}>
      <div ref={wrap} className="relative flex-1 min-h-[180px] rounded-xl overflow-hidden bg-[#0B111C]">
        <canvas ref={canvas} style={{ width: size.w, height: size.h }} className="block" />
      </div>
      <div className="h-[92px] overflow-y-auto rounded-lg bg-[#0B111C] border border-[#1E293B] p-2 text-[11px] text-slate-300" data-testid={`${testid}-notes`}>
        <div className="font-semibold text-amber-300">Fase {phase + 1}{info ? ` · ${info.label}` : ""}</div>
        {info?.notes.slice(0, 5).map((n, i) => <div key={i}>• {n}</div>)}
      </div>
    </div>
  );
});

export function CompareDialog({ open, onOpenChange, play }) {
  const [a, setA] = useState("man:switch");
  const [b, setB] = useState("man:over");
  const [playing, setPlaying] = useState(false);
  const pa = useMemo(() => (open ? variant(play, a) : null), [open, play, a]);
  const pb = useMemo(() => (open ? variant(play, b) : null), [open, play, b]);
  const ra = useRef(null), rb = useRef(null), tRef = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const step = (now) => {
      tRef.current += (now - last) / 1000;
      last = now;
      const total = Math.max(ra.current?.total || 0, rb.current?.total || 0);
      if (tRef.current >= total) {
        tRef.current = total;
        setPlaying(false);
      }
      ra.current?.draw(tRef.current);
      rb.current?.draw(tRef.current);
      if (tRef.current < total) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => {
    tRef.current = 0;
    setPlaying(false);
  }, [a, b, open]);
  const sel = (v, set, id) => (
    <select data-testid={id} value={v} onChange={(e) => set(e.target.value)} className="h-10 rounded-lg bg-[#0B111C] border border-[#1E293B] px-2 text-sm min-w-0 flex-1">
      {Object.entries(OPTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="compare-dialog" className="max-w-[min(1400px,98vw)] w-[98vw] h-[94dvh] bg-[#131C2E] border-[#1E293B] text-slate-100 flex flex-col p-3 sm:p-4 gap-3">
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading text-2xl uppercase tracking-tight">Confronto strategie</DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">Stesso attacco, stessa palla: a sinistra e a destra la difesa calcolata con due strategie diverse (lo schema originale non viene modificato).</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 items-center flex-wrap">
          {sel(a, setA, "compare-select-a")}
          <span className="font-heading font-bold text-slate-500">VS</span>
          {sel(b, setB, "compare-select-b")}
          <button data-testid="compare-restart" onClick={() => { tRef.current = 0; ra.current?.draw(0); rb.current?.draw(0); }} className="w-10 h-10 grid place-items-center rounded-full hover:bg-[#1A263D]"><RotateCcw className="w-4 h-4" /></button>
          <button data-testid="compare-play" onClick={() => { if (!playing && tRef.current >= Math.max(ra.current?.total || 0, rb.current?.total || 0)) tRef.current = 0; setPlaying((p) => !p); }} className="w-11 h-11 grid place-items-center rounded-full bg-amber-500 text-[#090D14]">{playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}</button>
        </div>
        {pa && pb && (
          <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">
            <Pane ref={ra} play={pa} testid="compare-pane-a" />
            <Pane ref={rb} play={pb} testid="compare-pane-b" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
