import { Radio, RotateCcw, SlidersHorizontal, CheckCheck, Unlock, Blocks } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MODES } from "@/lib/defense";

const SHORT = { man: "Uomo", zone23: "2-3", zone32: "3-2" };

export function LiveBar({ play, phaseIndex, onToggle, onMode, onReset, onUnlockAll, onConfirm, onParams, pnrOpen, onPnr }) {
  const on = !!play.defense?.live;
  const mode = play.defense?.mode || "man";
  const locks = Object.keys(play.phases[phaseIndex]?.locked || {}).length;
  return (
    <div data-testid="live-bar" className={`h-11 shrink-0 flex items-center gap-1.5 px-2 overflow-x-auto no-scrollbar border-b ${on ? "bg-blue-950/50 border-blue-900/60" : "bg-[#0B111C] border-[#1E293B]"}`}>
      <label className="flex items-center gap-2 shrink-0 pr-1" title="Costruzione tattica live">
        <Radio className={`w-4 h-4 ${on ? "text-red-400 animate-pulse" : "text-slate-500"}`} />
        <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap font-heading">Costruzione live</span>
        <Switch className="data-[state=unchecked]:bg-slate-600" data-testid="live-toggle" checked={on} onCheckedChange={onToggle} />
      </label>
      <div className="flex rounded-full bg-[#0B111C] border border-[#1E293B] p-0.5 shrink-0" data-testid="live-mode-select">
        {Object.keys(MODES).map((k) => (
          <button key={k} data-testid={`live-mode-${k}`} title={MODES[k]} onClick={() => onMode(k)} className={`h-7 px-2.5 rounded-full text-xs font-semibold ${mode === k ? "bg-blue-600 text-white" : "text-slate-300"}`}>{SHORT[k]}</button>
        ))}
      </div>
      <button data-testid="pnr-toggle-btn" onClick={onPnr} title="Coperture sul blocco frame per frame" className={`h-8 px-2.5 rounded-full text-xs font-semibold flex items-center gap-1 shrink-0 border ${pnrOpen ? "bg-blue-600 border-blue-500 text-white" : "border-[#334155] hover:bg-[#1A263D]"}`}><Blocks className="w-3.5 h-3.5" /><span className="sm:hidden">P&R</span><span className="hidden sm:inline">Blocco P&R</span></button>
      {on && (
        <>
          <button data-testid="live-reset-btn" onClick={onReset} title="Ripristina posizioni difensive generate" className="h-8 px-2.5 rounded-full text-xs font-semibold border border-[#334155] flex items-center gap-1 shrink-0 hover:bg-[#1A263D]"><RotateCcw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Ripristina</span></button>
          {locks > 0 && <button data-testid="live-unlock-all-btn" onClick={onUnlockAll} className="h-8 px-2.5 rounded-full text-xs font-semibold border border-amber-600/60 text-amber-300 flex items-center gap-1 shrink-0"><Unlock className="w-3.5 h-3.5" />{locks} {locks === 1 ? "bloccato" : "bloccati"}</button>}
          <button data-testid="live-confirm-phase-btn" onClick={onConfirm} title="Registra la fase e crea la successiva" className="h-8 px-2.5 rounded-full text-xs font-semibold bg-emerald-600 text-white flex items-center gap-1 shrink-0"><CheckCheck className="w-3.5 h-3.5" />Conferma fase</button>
        </>
      )}
      <button data-testid="live-params-btn" onClick={onParams} title="Parametri difensivi" className="h-8 w-8 rounded-full grid place-items-center border border-[#334155] shrink-0 hover:bg-[#1A263D] ml-auto"><SlidersHorizontal className="w-3.5 h-3.5" /></button>
    </div>
  );
}
