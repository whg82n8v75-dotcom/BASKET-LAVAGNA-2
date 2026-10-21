import { Shield, Wand2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MODES, STRATEGIES, PARAM_DEFS, DEFAULT_DEFENSE } from "@/lib/defense";

const Label = ({ children }) => <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">{children}</div>;

function Reading({ play, phaseIndex }) {
  const info = play.phases[phaseIndex]?.defInfo;
  if (!info) return <p className="text-xs text-slate-500" data-testid="defense-reading-empty">Premi "Genera difesa" per vedere la lettura tattica di ogni fase.</p>;
  return (
    <div data-testid="defense-reading" className="rounded-xl bg-[#0B111C] border border-[#1E293B] p-3 space-y-1.5">
      <div className="text-sm font-semibold text-amber-300">Fase {phaseIndex + 1} · Palla: {info.label}</div>
      {info.events?.length > 0 && <div className="text-xs text-sky-300">Eventi: {info.events.join(", ")}</div>}
      <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
        {info.notes.map((n, i) => <li key={i}>{n}</li>)}
      </ul>
    </div>
  );
}

export function DefensePanel({ open, onOpenChange, play, phaseIndex, onConfig, onGenerate }) {
  const cfg = { ...DEFAULT_DEFENSE, ...(play.defense || {}), params: { ...DEFAULT_DEFENSE.params, ...(play.defense?.params || {}) } };
  const set = (patch) => onConfig({ ...cfg, ...patch });
  const offs = play.players.filter((p) => p.team === "O");
  const defs = play.players.filter((p) => p.team === "D").sort((a, b) => a.number - b.number);
  const chip = (a) => `h-9 px-3 rounded-lg text-xs font-semibold border transition-colors ${a ? "bg-amber-500 text-[#090D14] border-amber-500" : "border-[#1E293B] text-slate-300 hover:bg-[#1A263D]"}`;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" data-testid="defense-panel" className="w-[min(400px,94vw)] bg-[#0E1522] border-[#1E293B] text-slate-100 overflow-y-auto p-4 pt-[max(16px,env(safe-area-inset-top))]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading text-2xl uppercase tracking-tight text-slate-100 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" />Motore difensivo</SheetTitle>
          <SheetDescription className="text-slate-400 text-xs">Posizioni calcolate con regole esplicite su palla, lato forte/debole, assegnazioni ed eventi (passaggi, penetrazioni, tagli, blocchi) di ogni fase.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 mt-4">
          <div>
            <Label>Modalità</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(MODES).map(([k, l]) => <button key={k} data-testid={`defense-mode-${k}`} onClick={() => set({ mode: k })} className={chip(cfg.mode === k)}>{l}</button>)}
            </div>
          </div>
          {cfg.mode === "man" && (
            <div>
              <Label>Strategia sui blocchi</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(STRATEGIES).map(([k, l]) => <button key={k} data-testid={`defense-strategy-${k}`} onClick={() => set({ strategy: k })} className={`${chip(cfg.strategy === k)} h-auto py-2 text-left leading-tight`}>{l}</button>)}
              </div>
            </div>
          )}
          {cfg.mode === "man" && (
            <div>
              <Label>Spinta sul palleggiatore</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button data-testid="defense-force-baseline" onClick={() => set({ force: "baseline" })} className={chip(cfg.force !== "middle")}>Verso il fondo</button>
                <button data-testid="defense-force-middle" onClick={() => set({ force: "middle" })} className={chip(cfg.force === "middle")}>Verso il centro</button>
              </div>
            </div>
          )}
          {cfg.mode !== "man" && <p className="text-xs text-slate-400">Sui blocchi la zona non cambia: ogni difensore resta nella propria area.</p>}
          {cfg.mode === "man" && (
            <div>
              <Label>Assegnazioni</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {defs.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-xs">
                    <span className="w-7 h-7 rounded-full grid place-items-center font-heading font-bold text-white shrink-0" style={{ background: d.color }}>{d.number}</span>
                    <select data-testid={`defense-assign-${d.id}`} value={cfg.assign?.[d.id] || offs.find((o) => o.number === d.number)?.id || ""} onChange={(e) => set({ assign: { ...cfg.assign, [d.id]: e.target.value } })} className="flex-1 h-9 rounded-lg bg-[#0B111C] border border-[#1E293B] px-2 text-sm">
                      {offs.map((o) => <option key={o.id} value={o.id}>{`marca A${o.number}${o.name ? " " + o.name : ""}`}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}
          {cfg.mode !== "man" && (
            <p className="text-xs text-slate-400">Ruoli: i difensori vengono assegnati per numero ({cfg.mode === "zone23" ? "D1-D2 prima linea sx/dx, D3-D4 seconda linea sx/dx, D5 centro" : "D1 punta, D2-D3 ali sx/dx, D4-D5 bassi sx/dx"}).</p>
          )}
          <div className="space-y-4">
            <Label>Parametri</Label>
            {PARAM_DEFS.map((p) => (
              <div key={p.k}>
                <div className="flex justify-between text-xs mb-1.5"><span>{p.label}</span><span className="font-mono text-amber-400">{Math.round(cfg.params[p.k] * 100)}</span></div>
                <Slider data-testid={`defense-param-${p.k}`} min={0} max={1} step={0.05} value={[cfg.params[p.k]]} onValueChange={([v]) => set({ params: { ...cfg.params, [p.k]: v } })} />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>{p.lo}</span><span>{p.hi}</span></div>
              </div>
            ))}
          </div>
          <label className="flex items-center justify-between text-sm">
            <span>Anteprima rotazioni (sagome di destinazione)</span>
            <Switch className="data-[state=unchecked]:bg-slate-600" data-testid="defense-preview-switch" checked={cfg.preview !== false} onCheckedChange={(preview) => set({ preview })} />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Frecce dei movimenti difensivi</span>
            <Switch className="data-[state=unchecked]:bg-slate-600" data-testid="defense-arrows-switch" checked={cfg.arrows} onCheckedChange={(arrows) => set({ arrows })} />
          </label>
          <button data-testid="defense-generate-btn" onClick={onGenerate} className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 transition-colors"><Wand2 className="w-5 h-5" />Genera difesa</button>
          <div>
            <Label>Lettura tattica</Label>
            <Reading play={play} phaseIndex={phaseIndex} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
