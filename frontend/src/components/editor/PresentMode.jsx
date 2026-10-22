import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, X, MessageSquareText, Gauge } from "lucide-react";
import { makeView } from "@/lib/court";
import { drawScene } from "@/lib/render";
import { buildTimeline, frameAt, holdStart } from "@/lib/engine";

const SPEEDS = [0.5, 0.75, 1, 1.5];
const mmOf = (play, i) => Object.fromEntries((play.phases[i]?.defInfo?.mismatches || []).map((m) => [m.d, m.kind]));

function useWakeAndFullscreen() {
  useEffect(() => {
    let lock = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        lock = null;
      }
    };
    const onVis = () => document.visibilityState === "visible" && acquire();
    acquire();
    document.addEventListener("visibilitychange", onVis);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release?.().catch(() => {});
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);
}

const BigBtn = ({ children, className = "", ...p }) => (
  <button {...p} className={`w-14 h-14 sm:w-16 sm:h-16 grid place-items-center rounded-full bg-white/10 text-white active:scale-95 hover:bg-white/20 disabled:opacity-30 transition-transform ${className}`}>{children}</button>
);

export function PresentMode({ play, startPhase = 0, playerSize = 1, onClose }) {
  useWakeAndFullscreen();
  const wrap = useRef(null);
  const canvas = useRef(null);
  const tl = useMemo(() => buildTimeline(play), [play]);
  const n = play.phases.length;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [notes, setNotes] = useState(false);
  const [phase, setPhase] = useState(startPhase);
  const tRef = useRef(holdStart(tl, startPhase));
  const stopAt = useRef(null);
  const view = useMemo(() => (size.w > 10 ? makeView(size.w, size.h, play.courtMode, Math.min(2, window.devicePixelRatio || 1)) : null), [size, play.courtMode]);

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!view || !c) return;
    if (c.width !== Math.round(view.w * view.dpr) || c.height !== Math.round(view.h * view.dpr)) {
      c.width = Math.round(view.w * view.dpr);
      c.height = Math.round(view.h * view.dpr);
    }
    const fr = frameAt(play, tl, Math.min(tRef.current, tl.total - 1e-4), true);
    drawScene(c.getContext("2d"), view, play, fr, { size: playerSize * 1.15, mismatch: mmOf(play, fr.phaseIndex) });
    setPhase(fr.phaseIndex);
  }, [view, play, tl, playerSize]);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => draw(), [draw]);

  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const step = (now) => {
      tRef.current += ((now - last) / 1000) * speed;
      last = now;
      const end = stopAt.current ?? tl.total;
      const done = tRef.current >= end;
      if (done) tRef.current = Math.min(end, tl.total);
      draw();
      if (done) {
        stopAt.current = null;
        setPlaying(false);
      } else raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, tl, draw]);

  const togglePlay = useCallback(() => {
    if (!playing && tRef.current >= tl.total - 1e-3) tRef.current = 0;
    stopAt.current = null;
    setPlaying((p) => !p);
  }, [playing, tl]);
  const jump = useCallback((i) => {
    setPlaying(false);
    stopAt.current = null;
    tRef.current = holdStart(tl, Math.max(0, Math.min(n - 1, i)));
    draw();
  }, [tl, n, draw]);
  const next = useCallback(() => {
    if (phase >= n - 1) return;
    stopAt.current = holdStart(tl, phase + 1);
    tRef.current = Math.max(tRef.current, holdStart(tl, phase));
    setPlaying(true);
  }, [phase, n, tl]);
  const prev = useCallback(() => jump(tRef.current > holdStart(tl, phase) + 0.05 ? phase : phase - 1), [jump, phase, tl]);
  const restart = useCallback(() => jump(0), [jump]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, next, prev, onClose]);

  const swipe = useRef(null);
  const onDown = (e) => (swipe.current = { x: e.clientX, y: e.clientY });
  const onUp = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
    else if (Math.hypot(dx, dy) < 12) togglePlay();
  };

  const info = play.phases[phase]?.defInfo;
  return (
    <div data-testid="present-mode" className="fixed inset-0 z-[70] bg-[#05080D] text-white flex flex-col select-none" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="h-14 shrink-0 flex items-center gap-3 px-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="font-heading text-xl sm:text-3xl font-extrabold uppercase tracking-tight truncate" data-testid="present-title">{play.name}</div>
        </div>
        <div data-testid="present-phase-label" className="font-heading text-2xl sm:text-4xl font-extrabold text-amber-400 tabular-nums">FASE {phase + 1}<span className="text-white/40 text-xl sm:text-2xl">/{n}</span></div>
        <button data-testid="present-close" onClick={onClose} className="w-12 h-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/20" title="Esci"><X className="w-6 h-6" /></button>
      </div>
      <div ref={wrap} data-testid="present-court" className="relative flex-1 min-h-0 touch-none" onPointerDown={onDown} onPointerUp={onUp}>
        <canvas ref={canvas} style={{ width: size.w, height: size.h }} className="block" />
        {size.h > size.w * 1.3 && !playing && (
          <div data-testid="present-rotate-hint" className="absolute top-3 inset-x-0 text-center text-sm text-white/55 pointer-events-none">Ruota il dispositivo in orizzontale per un campo più grande</div>
        )}
        {notes && info && (
          <div data-testid="present-notes" className="absolute left-3 bottom-3 max-w-[min(560px,90%)] rounded-2xl bg-black/75 backdrop-blur p-3 sm:p-4 text-sm sm:text-base pointer-events-none">
            <div className="font-heading text-lg sm:text-xl font-bold uppercase text-blue-300">{info.label}</div>
            {info.notes.slice(0, 4).map((t, i) => <div key={i} className="text-white/85">• {t}</div>)}
          </div>
        )}
      </div>
      <div className="shrink-0 px-3 sm:px-6 pt-2 pb-3">
        <div className="flex gap-1.5 mb-3" data-testid="present-phase-dots">
          {play.phases.map((_, i) => (
            <button key={i} data-testid={`present-phase-${i}`} onClick={() => jump(i)} className={`h-3 flex-1 rounded-full transition-colors ${i === phase ? "bg-amber-400" : i < phase ? "bg-amber-400/40" : "bg-white/15"}`} title={`Fase ${i + 1}`} />
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          <BigBtn data-testid="present-restart" onClick={restart} title="Dall'inizio"><RotateCcw className="w-7 h-7" /></BigBtn>
          <BigBtn data-testid="present-prev" onClick={prev} disabled={phase === 0 && tRef.current <= 0.05} title="Fase precedente"><ChevronLeft className="w-9 h-9" /></BigBtn>
          <button data-testid="present-play" onClick={togglePlay} className="w-20 h-20 sm:w-24 sm:h-24 grid place-items-center rounded-full bg-amber-500 text-[#090D14] active:scale-95 shadow-[0_0_40px_rgba(245,158,11,0.35)]" title={playing ? "Pausa" : "Riproduci"}>
            {playing ? <Pause className="w-10 h-10" fill="currentColor" /> : <Play className="w-10 h-10 ml-1" fill="currentColor" />}
          </button>
          <BigBtn data-testid="present-next" onClick={next} disabled={phase >= n - 1} title="Fase successiva"><ChevronRight className="w-9 h-9" /></BigBtn>
          <BigBtn data-testid="present-speed" onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])} title="Velocità" className="flex-col gap-0"><Gauge className="w-5 h-5" /><span className="text-sm font-bold">{speed}×</span></BigBtn>
          <BigBtn data-testid="present-notes-toggle" onClick={() => setNotes((v) => !v)} title="Lettura tattica" className={notes ? "!bg-blue-600" : ""}><MessageSquareText className="w-7 h-7" /></BigBtn>
        </div>
      </div>
    </div>
  );
}
