import { Play, Pause, RotateCcw, StepBack, StepForward, Plus, Copy, Trash2, ArrowLeft, ArrowRight, Repeat } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { EASING_LABELS } from "@/lib/engine";

const SPEEDS = [0.5, 0.75, 1, 1.5, 2];

function CtrlBtn({ children, testid, onClick, title, primary, active }) {
  return (
    <button
      data-testid={testid}
      title={title}
      onClick={onClick}
      className={`grid place-items-center rounded-full shrink-0 transition-colors duration-150 ${primary ? "w-12 h-12 bg-amber-500 text-[#090D14] hover:bg-amber-400" : `w-10 h-10 ${active ? "bg-[#1A263D] text-amber-400" : "text-slate-200 hover:bg-[#1A263D]"}`}`}
    >
      {children}
    </button>
  );
}

function PhaseSettings({ phase, index, count, onUpdate, onDuplicate, onDelete, onMove }) {
  return (
    <div className="space-y-4" data-testid="phase-settings">
      <div className="font-heading text-lg font-bold uppercase tracking-tight">Fase {index + 1}</div>
      <input
        data-testid="phase-label-input"
        value={phase.label || ""}
        onChange={(e) => onUpdate({ label: e.target.value })}
        placeholder="Nota (es. Blocco del 5)"
        className="w-full h-10 px-3 rounded-lg bg-[#0B111C] border border-[#1E293B] text-sm outline-none focus:border-amber-500"
      />
      {index > 0 && (
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-2"><span>Durata movimento</span><span className="font-mono text-slate-200">{phase.duration.toFixed(1)}s</span></div>
          <Slider data-testid="phase-duration-slider" min={0.3} max={5} step={0.1} value={[phase.duration]} onValueChange={([v]) => onUpdate({ duration: v })} />
        </div>
      )}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-2"><span>{index === 0 ? "Pausa iniziale" : "Pausa dopo il movimento"}</span><span className="font-mono text-slate-200">{phase.pause.toFixed(1)}s</span></div>
        <Slider data-testid="phase-pause-slider" min={0} max={3} step={0.1} value={[phase.pause]} onValueChange={([v]) => onUpdate({ pause: v })} />
      </div>
      {index > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-2">Curva del movimento</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(EASING_LABELS).map(([k, l]) => (
              <button key={k} data-testid={`phase-easing-${k}`} onClick={() => onUpdate({ easing: k })} className={`h-9 rounded-lg text-xs font-semibold border ${phase.easing === k ? "bg-amber-500 text-[#090D14] border-amber-500" : "border-[#1E293B] text-slate-300 hover:bg-[#1A263D]"}`}>{l}</button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        <button data-testid="phase-move-left" disabled={index === 0} onClick={() => onMove(-1)} className="h-10 rounded-lg border border-[#1E293B] grid place-items-center disabled:opacity-30 hover:bg-[#1A263D]" title="Sposta a sinistra"><ArrowLeft className="w-4 h-4" /></button>
        <button data-testid="phase-move-right" disabled={index === count - 1} onClick={() => onMove(1)} className="h-10 rounded-lg border border-[#1E293B] grid place-items-center disabled:opacity-30 hover:bg-[#1A263D]" title="Sposta a destra"><ArrowRight className="w-4 h-4" /></button>
        <button data-testid="phase-duplicate" onClick={onDuplicate} className="h-10 rounded-lg border border-[#1E293B] grid place-items-center hover:bg-[#1A263D]" title="Duplica"><Copy className="w-4 h-4" /></button>
        <button data-testid="phase-delete" disabled={count < 2} onClick={onDelete} className="h-10 rounded-lg border border-red-900/60 text-red-400 grid place-items-center disabled:opacity-30 hover:bg-red-950/40" title="Elimina"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export function Timeline({ phases, current, playing, speed, loop, progressRef, onSelect, onPlayPause, onRestart, onPrev, onNext, onSpeed, onLoop, onAdd, phaseOps, settingsOpen, setSettingsOpen }) {
  const nextSpeed = () => onSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]);
  return (
    <div data-testid="timeline" className="bg-[#0E1522] border-t border-[#1E293B] px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] shrink-0">
      <div className="h-1 rounded-full bg-[#1E293B] overflow-hidden mb-1.5"><div ref={progressRef} data-testid="timeline-progress" className="h-full bg-amber-500 w-0" /></div>
      <div className="flex flex-col landscape:flex-row gap-1.5 landscape:items-center">
        <div className="flex items-center gap-1 justify-center">
          <CtrlBtn testid="timeline-restart" title="Torna all'inizio" onClick={onRestart}><RotateCcw className="w-[18px] h-[18px]" /></CtrlBtn>
          <CtrlBtn testid="timeline-prev" title="Fase precedente" onClick={onPrev}><StepBack className="w-5 h-5" /></CtrlBtn>
          <CtrlBtn testid="timeline-play" title={playing ? "Pausa" : "Riproduci"} onClick={onPlayPause} primary>{playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}</CtrlBtn>
          <CtrlBtn testid="timeline-next" title="Fase successiva (anima)" onClick={onNext}><StepForward className="w-5 h-5" /></CtrlBtn>
          <button data-testid="timeline-speed" onClick={nextSpeed} title="Velocità" className="h-10 min-w-[52px] px-2 rounded-full font-mono text-sm font-bold text-amber-400 hover:bg-[#1A263D]">{speed}x</button>
          <CtrlBtn testid="timeline-loop" title="Ripeti in loop" onClick={onLoop} active={loop}><Repeat className="w-[18px] h-[18px]" /></CtrlBtn>
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5" data-testid="phase-list">
            {phases.map((ph, i) => {
              const active = i === current;
              const chip = (
                <button
                  key={ph.id}
                  data-testid={`phase-chip-${i}`}
                  onClick={() => (active ? setSettingsOpen(true) : onSelect(i))}
                  className={`shrink-0 h-11 px-3 rounded-xl border text-left transition-colors duration-150 ${active ? "bg-amber-500/15 border-amber-500 text-amber-300" : "border-[#1E293B] text-slate-300 hover:bg-[#1A263D]"}`}
                >
                  <div className="font-heading font-bold text-sm leading-none uppercase">Fase {i + 1}</div>
                  <div className="font-mono text-[10px] text-slate-400 mt-1 leading-none max-w-[90px] truncate">{ph.label || (i === 0 ? "Inizio" : `${ph.duration.toFixed(1)}s`)}</div>
                </button>
              );
              if (!active) return chip;
              return (
                <Popover key={ph.id} open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <PopoverTrigger asChild>{chip}</PopoverTrigger>
                  <PopoverContent side="top" className="w-72 bg-[#131C2E] border-[#1E293B] text-slate-100">
                    <PhaseSettings phase={ph} index={i} count={phases.length} {...phaseOps} />
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
          <button data-testid="phase-add" onClick={onAdd} title="Nuova fase" className="shrink-0 h-11 px-3 rounded-xl bg-[#1A263D] text-amber-400 font-semibold text-sm flex items-center gap-1 hover:bg-[#22314d]"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Fase</span></button>
        </div>
      </div>
    </div>
  );
}
