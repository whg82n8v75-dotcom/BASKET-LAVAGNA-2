import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Plus, Copy, ScanSearch, RotateCcw, Trash2 } from "lucide-react";
import { COVERAGES, COV_DESC, OFF_KINDS, OFF_COV, OFF_DESC, OFF_SHORT } from "@/lib/defense";

const SHORT = { over: "OVER", under: "UNDER", switch: "SWITCH", show: "SHOW", trap: "TRAP", drop: "DROP", ice: "ICE", contain: "CONTIENI", recover: "RECUPERO", manual: "MANUALE" };
export const covTags = (ph) => {
  const out = {};
  const c = ph?.pnr;
  if (c?.dB && c?.dS && c?.S && c?.T) Object.assign(out, { [c.dB]: SHORT[c.aB] || "", [c.dS]: SHORT[c.aS] || "" });
  (ph?.offScreens || []).forEach((o) => {
    if (o.dC && o.dS && o.S && o.C) Object.assign(out, { [o.dC]: OFF_SHORT[o.aC] || "", [o.dS]: OFF_SHORT[o.aS] || "" });
  });
  return Object.keys(out).length ? out : null;
};

const lab = (play, id) => {
  const p = play.players.find((x) => x.id === id);
  return p ? `${p.team === "O" ? "A" : "D"}${p.number}${p.name ? " " + p.name : ""}` : "—";
};

function Pick({ label, value, options, onChange, play, testid }) {
  return (
    <label className="block text-[11px] text-slate-400">
      {label}
      <select data-testid={testid} value={value || ""} onChange={(e) => onChange(e.target.value || null)} className="mt-0.5 w-full h-9 rounded-lg bg-[#0B111C] border border-[#1E293B] px-2 text-sm text-slate-100">
        <option value="">—</option>
        {options.map((p) => <option key={p.id} value={p.id}>{lab(play, p.id)}</option>)}
      </select>
    </label>
  );
}

function CovGroup({ title, role, value, onPick, options = COVERAGES, desc, prefix = "pnr" }) {
  return (
    <div data-testid={`${prefix}-group-${role}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-1">{title}</div>
      <div className="grid grid-cols-2 gap-1">
        {Object.entries(options).map(([k, l]) => (
          <button key={k} data-testid={`${prefix}-${role}-${k}`} onClick={() => onPick(k)} className={`h-8 px-2 rounded-lg text-[11px] font-semibold text-left truncate border ${value === k ? "bg-blue-600 border-blue-500 text-white" : "border-[#1E293B] text-slate-300 hover:bg-[#1A263D]"}`}>{l}</button>
        ))}
      </div>
      {value && <div className="text-[11px] text-blue-200/80 mt-1" data-testid={`${prefix}-desc-${role}`}>{desc ? desc[value] : COV_DESC[role === "ball" ? "B" : "S"][value]}</div>}
    </div>
  );
}

function OffScreen({ play, o, i, offs, defs, onSet, onReapply, onRemove }) {
  const t = `off-${i}`;
  return (
    <div data-testid={t} className="rounded-xl border border-[#1E293B] p-2 space-y-2">
      <label className="block text-[11px] text-slate-400">
        Tipo di blocco
        <select data-testid={`${t}-kind`} value={o.kind || "other"} onChange={(e) => onSet({ kind: e.target.value })} className="mt-0.5 w-full h-9 rounded-lg bg-[#0B111C] border border-[#1E293B] px-2 text-sm text-slate-100">
          {Object.entries(OFF_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Pick label="Bloccante" testid={`${t}-screener`} value={o.S} options={offs} play={play} onChange={(S) => onSet({ S })} />
        <Pick label="Tagliatore" testid={`${t}-cutter`} value={o.C} options={offs} play={play} onChange={(C) => onSet({ C })} />
        <Pick label="Difensore del tagliatore" testid={`${t}-cutter-def`} value={o.dC} options={defs} play={play} onChange={(dC) => onSet({ dC })} />
        <Pick label="Difensore del bloccante" testid={`${t}-screen-def`} value={o.dS} options={defs} play={play} onChange={(dS) => onSet({ dS })} />
      </div>
      {(!o.S || !o.C || !o.dC || !o.dS) && <p className="text-xs text-amber-300">Completa i quattro giocatori per applicare le coperture.</p>}
      <CovGroup prefix={t} title={`${lab(play, o.dC)} · sul tagliatore`} role="cutter" value={o.aC} options={OFF_COV.C} desc={OFF_DESC.C} onPick={(aC) => onSet({ aC }, [o.dC])} />
      <CovGroup prefix={t} title={`${lab(play, o.dS)} · sul bloccante`} role="screen" value={o.aS} options={OFF_COV.S} desc={OFF_DESC.S} onPick={(aS) => onSet({ aS }, [o.dS])} />
      <div className="grid grid-cols-2 gap-1.5">
        <button data-testid={`${t}-reapply`} onClick={onReapply} className="h-9 rounded-full border border-[#334155] text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#1A263D]"><RotateCcw className="w-3.5 h-3.5" />Riapplica</button>
        <button data-testid={`${t}-remove`} onClick={onRemove} className="h-9 rounded-full border border-red-900/60 text-red-300 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-red-950/40"><Trash2 className="w-3.5 h-3.5" />Togli</button>
      </div>
    </div>
  );
}

export function PnrDock({ play, idx, onClose, onPrev, onNext, onAdd, onDuplicate, onGo, onDetect, onSet, onReapply, onRemove, off }) {
  const [tab, setTab] = useState("ball");
  const ph = play.phases[idx];
  const c = ph.pnr;
  const offs = play.players.filter((p) => p.team === "O");
  const defs = play.players.filter((p) => p.team === "D");
  const others = (ph.defInfo?.notes || []).filter((n) => !n.includes(" — "));
  return (
    <div data-testid="pnr-dock" className="order-3 shrink-0 min-h-0 overflow-y-auto bg-[#0E1522] border-t landscape:border-t-0 landscape:border-l border-[#1E293B] p-3 space-y-3 max-h-[42dvh] landscape:max-h-none landscape:w-[300px] xl:landscape:w-[340px]">
      <div className="flex items-center gap-1">
        <div className="font-heading text-base font-extrabold uppercase tracking-tight flex-1 whitespace-nowrap">Blocco · <span data-testid="pnr-frame-label" className="text-amber-400">Frame {idx + 1}/{play.phases.length}</span></div>
        <button data-testid="pnr-prev" onClick={onPrev} disabled={idx === 0} className="w-8 h-8 grid place-items-center rounded-full hover:bg-[#1A263D] disabled:opacity-30" title="Frame precedente"><ChevronLeft className="w-4 h-4" /></button>
        <button data-testid="pnr-next" onClick={onNext} disabled={idx >= play.phases.length - 1} className="w-8 h-8 grid place-items-center rounded-full hover:bg-[#1A263D] disabled:opacity-30" title="Frame successivo"><ChevronRight className="w-4 h-4" /></button>
        <button data-testid="pnr-add-frame" onClick={onAdd} className="w-8 h-8 grid place-items-center rounded-full hover:bg-[#1A263D] text-amber-400" title="Nuovo frame (copia posizioni e coperture)"><Plus className="w-4 h-4" /></button>
        <button data-testid="pnr-duplicate-frame" onClick={onDuplicate} className="w-8 h-8 grid place-items-center rounded-full hover:bg-[#1A263D]" title="Duplica frame"><Copy className="w-4 h-4" /></button>
        <button data-testid="pnr-close" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-[#1A263D]" title="Chiudi"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 rounded-full bg-[#0B111C] border border-[#1E293B] p-0.5">
        {[["ball", "Sulla palla"], ["off", `Lontano dalla palla${ph.offScreens?.length ? ` (${ph.offScreens.length})` : ""}`]].map(([k, l]) => (
          <button key={k} data-testid={`pnr-tab-${k}`} onClick={() => setTab(k)} className={`h-8 rounded-full text-xs font-semibold ${tab === k ? "bg-blue-600 text-white" : "text-slate-300"}`}>{l}</button>
        ))}
      </div>
      {tab === "off" ? (
        <div className="space-y-2" data-testid="off-list">
          {(ph.offScreens || []).map((o, i) => (
            <OffScreen key={o.id || i} play={play} o={o} i={i} offs={offs} defs={defs} onSet={(patch, ids) => off.onSet(i, patch, ids)} onReapply={() => off.onReapply(i)} onRemove={() => off.onRemove(i)} />
          ))}
          {(ph.offScreens || []).length < 3 && (
            <button data-testid="off-add" onClick={off.onAdd} className="w-full h-10 rounded-full bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2"><ScanSearch className="w-4 h-4" />Aggiungi blocco lontano dalla palla</button>
          )}
          <p className="text-[11px] text-slate-500">Rileva il blocco disegnato (pin-down, flare, back, cross) o lo copia dal frame precedente; puoi gestirne fino a 3 per frame (es. stagger).</p>
        </div>
      ) : !c ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Nessun blocco impostato in questo frame. Rileva il blocco disegnato (strumento Blocco) oppure scegli i giocatori a mano.</p>
          <button data-testid="pnr-detect" onClick={onDetect} className="w-full h-10 rounded-full bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2"><ScanSearch className="w-4 h-4" />Rileva / imposta blocco</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Pick label="Bloccante" testid="pnr-screener" value={c.S} options={offs} play={play} onChange={(S) => onSet({ S })} />
            <Pick label="Palleggiatore" testid="pnr-handler" value={c.T} options={offs} play={play} onChange={(T) => onSet({ T })} />
            <Pick label="Difensore sulla palla" testid="pnr-ball-def" value={c.dB} options={defs} play={play} onChange={(dB) => onSet({ dB })} />
            <Pick label="Difensore del bloccante" testid="pnr-screen-def" value={c.dS} options={defs} play={play} onChange={(dS) => onSet({ dS })} />
          </div>
          {(!c.S || !c.T || !c.dB || !c.dS) && <p data-testid="pnr-incomplete" className="text-xs text-amber-300">Completa i quattro giocatori per applicare le coperture.</p>}
          <CovGroup title={`${lab(play, c.dB)} · sulla palla`} role="ball" value={c.aB} onPick={(aB) => onSet({ aB }, ["B"])} />
          <CovGroup title={`${lab(play, c.dS)} · sul bloccante`} role="screen" value={c.aS} onPick={(aS) => onSet({ aS }, ["S"])} />
          <div className="grid grid-cols-2 gap-1.5">
            <button data-testid="pnr-reapply" onClick={onReapply} className="h-9 rounded-full border border-[#334155] text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#1A263D]"><RotateCcw className="w-3.5 h-3.5" />Riapplica</button>
            <button data-testid="pnr-remove" onClick={onRemove} className="h-9 rounded-full border border-red-900/60 text-red-300 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-red-950/40"><Trash2 className="w-3.5 h-3.5" />Togli dal frame</button>
          </div>
        </>
      )}
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-1">Sequenza coperture</div>
        <div className="space-y-1" data-testid="pnr-sequence">
          {play.phases.map((p, i) => (
            <button key={p.id} data-testid={`pnr-seq-${i}`} onClick={() => onGo(i)} className={`w-full text-left text-[11px] px-2 py-1.5 rounded-lg border ${i === idx ? "border-amber-500 bg-amber-500/10" : "border-[#1E293B] hover:bg-[#1A263D]"}`}>
              <span className="font-bold text-amber-300">F{i + 1}</span>{" "}
              {p.offScreens?.length > 0 && <span className="text-slate-400">{p.offScreens.map((o) => `${OFF_KINDS[o.kind] || "Blocco"}: ${lab(play, o.dC)} ${OFF_COV.C[o.aC] || "—"} · ${lab(play, o.dS)} ${OFF_COV.S[o.aS] || "—"}`).join(" | ")}{p.pnr ? " | " : ""}</span>}
              {p.pnr ? `${!p.pnr.S || !p.pnr.T || !p.pnr.dB || !p.pnr.dS ? "(incompleto) " : ""}${lab(play, p.pnr.dB)} ${COVERAGES[p.pnr.aB] || "—"} · ${lab(play, p.pnr.dS)} ${COVERAGES[p.pnr.aS] || "—"}` : !p.offScreens?.length && <span className="text-slate-500">nessun blocco</span>}
            </button>
          ))}
        </div>
      </div>
      {others.length > 0 && (
        <div data-testid="pnr-others">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-1">Reazione degli altri difensori</div>
          {others.slice(0, 6).map((n, i) => <div key={i} className="text-[11px] text-slate-400">• {n}</div>)}
        </div>
      )}
    </div>
  );
}
