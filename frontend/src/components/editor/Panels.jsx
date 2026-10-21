import { X, Trash2, Circle, Lock, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PLAYER_COLORS, DRAW_COLORS } from "@/lib/model";
import { TOOLS } from "./Toolbar";
import { SYMBOLS } from "@/lib/render";

const Card = ({ children, testid }) => (
  <div data-testid={testid} className="absolute right-2 top-2 z-20 w-[min(300px,calc(100%-16px))] rounded-2xl bg-[#131C2E]/95 backdrop-blur-xl border border-[#1E293B] shadow-2xl p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">{children}</div>
);

function Swatches({ colors, value, onPick, prefix }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button key={c} data-testid={`${prefix}-${c.slice(1)}`} onClick={() => onPick(c)} className={`w-8 h-8 rounded-full border-2 transition-transform duration-150 ${value === c ? "border-amber-400 scale-110" : "border-white/10"}`} style={{ background: c }} />
      ))}
    </div>
  );
}

export function PlayerPanel({ player, hasBall, onChange, onGiveBall, onRemove, onClose, lockable, locked, onToggleLock }) {
  return (
    <Card testid="player-panel">
      <div className="flex items-center justify-between">
        <div className="font-heading font-bold uppercase text-lg">{player.team === "O" ? "Attaccante" : "Difensore"}</div>
        <button data-testid="player-panel-close" onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full hover:bg-[#1A263D]"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <label className="text-[11px] text-slate-400">Numero
          <input data-testid="player-number-input" type="number" inputMode="numeric" min={0} max={99} value={player.number} onChange={(e) => onChange({ number: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })} className="mt-1 w-full h-10 px-2 rounded-lg bg-[#0B111C] border border-[#1E293B] text-base text-center font-heading font-bold outline-none focus:border-amber-500" />
        </label>
        <label className="text-[11px] text-slate-400">Nome
          <input data-testid="player-name-input" value={player.name} maxLength={14} onChange={(e) => onChange({ name: e.target.value })} placeholder="Opzionale" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#0B111C] border border-[#1E293B] text-base outline-none focus:border-amber-500" />
        </label>
      </div>
      <Swatches colors={PLAYER_COLORS} value={player.color} onPick={(color) => onChange({ color })} prefix="player-color" />
      <div className="grid grid-cols-2 gap-2">
        <button data-testid="player-give-ball" onClick={onGiveBall} disabled={hasBall} className="h-10 rounded-lg bg-orange-600/90 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"><Circle className="w-4 h-4" fill="currentColor" />{hasBall ? "Ha la palla" : "Dai la palla"}</button>
        {lockable && (
          <button data-testid="player-lock-toggle" onClick={onToggleLock} className={`col-span-2 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 border ${locked ? "border-amber-500 text-amber-300 bg-amber-500/10" : "border-[#334155] text-slate-200 hover:bg-[#1A263D]"}`}>
            {locked ? <><Unlock className="w-4 h-4" />Sblocca (torna automatico)</> : <><Lock className="w-4 h-4" />Blocca difensore</>}
          </button>
        )}
        <button data-testid="player-remove" onClick={onRemove} className="h-10 rounded-lg border border-red-900/60 text-red-400 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-red-950/40"><Trash2 className="w-4 h-4" />Rimuovi</button>
      </div>
    </Card>
  );
}

export function DrawingPanel({ drawing, onChange, onDelete, onClose }) {
  const label = drawing.type === "symbol" ? SYMBOLS[drawing.kind]?.label : TOOLS.find((t) => t.id === drawing.type)?.label;
  return (
    <Card testid="drawing-panel">
      <div className="flex items-center justify-between">
        <div className="font-heading font-bold uppercase text-lg">{label}</div>
        <button data-testid="drawing-panel-close" onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full hover:bg-[#1A263D]"><X className="w-4 h-4" /></button>
      </div>
      {drawing.playerId && <div className="text-xs text-emerald-400">Collegata al movimento animato del giocatore</div>}
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Mantieni visibile nelle fasi successive</span>
        <Switch className="data-[state=unchecked]:bg-slate-600" data-testid="drawing-persist-switch" checked={!!drawing.persist} onCheckedChange={(persist) => onChange({ persist })} />
      </label>
      {drawing.type !== "symbol" && <Swatches colors={DRAW_COLORS} value={drawing.color} onPick={(color) => onChange({ color })} prefix="drawing-color" />}
      <button data-testid="drawing-delete" onClick={onDelete} className="w-full h-10 rounded-lg border border-red-900/60 text-red-400 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-red-950/40"><Trash2 className="w-4 h-4" />Elimina</button>
    </Card>
  );
}

export function ToolOptions({ tool, drawColor, setDrawColor, symbolKind, setSymbolKind }) {
  if (["select", "eraser"].includes(tool)) return null;
  return (
    <div data-testid="tool-options" className="absolute left-2 top-2 z-10 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-16px)] rounded-2xl bg-[#131C2E]/90 backdrop-blur-xl border border-[#1E293B] p-1.5">
      {tool === "symbol"
        ? Object.entries(SYMBOLS).map(([k, s]) => (
            <button key={k} data-testid={`symbol-${k}`} title={s.label} onClick={() => setSymbolKind(k)} className={`h-8 pl-1 pr-2 rounded-full flex items-center gap-1 text-[11px] font-semibold ${symbolKind === k ? "bg-[#1A263D] ring-1 ring-amber-400" : ""}`}>
              <span className="w-6 h-6 rounded-full grid place-items-center text-white font-heading font-extrabold text-sm" style={{ background: s.color }}>{k}</span>
              <span className="hidden sm:inline text-slate-300">{s.label}</span>
            </button>
          ))
        : DRAW_COLORS.map((c) => (
            <button key={c} data-testid={`draw-color-${c.slice(1)}`} onClick={() => setDrawColor(c)} className={`w-7 h-7 rounded-full border-2 ${drawColor === c ? "border-amber-400" : "border-white/15"}`} style={{ background: c }} />
          ))}
    </div>
  );
}
