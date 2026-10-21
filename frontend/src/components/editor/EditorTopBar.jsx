import { useState } from "react";
import { ChevronLeft, Undo2, Redo2, EllipsisVertical, Eye, EyeOff, Check, Video, Image as ImageIcon, Images, FileDown, Copy, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { CATEGORIES } from "@/lib/model";
import { usePlays } from "@/lib/store";
import { exportPlaysJSON, safeName, shareOrDownload, isIOS } from "@/lib/storage";
import { phasePNG, framesSheetPNG } from "@/lib/recorder";

const VIS = [
  { k: "O", label: "Attacco", dot: "#FACC15" },
  { k: "D", label: "Difesa", dot: "#2563EB" },
  { k: "ball", label: "Palla", dot: "#EA580C" },
];

async function deliver(blobPromise, filename) {
  const blob = await blobPromise;
  if (isIOS()) toast("Immagine pronta", { action: { label: "Salva", onClick: () => shareOrDownload(blob, filename) }, duration: 10000 });
  else {
    await shareOrDownload(blob, filename);
    toast.success("Immagine esportata");
  }
}

export function EditorTopBar({ play, canUndo, canRedo, onUndo, onRedo, onBack, onRename, onChange, onAddPlayer, onExportVideo, onDuplicatePlay, phaseIndex, onOpenDefense }) {
  const { savedAt, settings } = usePlays();
  const [editing, setEditing] = useState(false);
  const hidden = play.hidden || {};
  const toggle = (k) => onChange({ ...play, hidden: { ...hidden, [k]: !hidden[k] } });
  const base = safeName(play.name);
  return (
    <div data-testid="editor-topbar" className="h-12 shrink-0 flex items-center gap-1 px-1.5 bg-[#0E1522] border-b border-[#1E293B]">
      <button data-testid="editor-back-btn" onClick={onBack} className="w-10 h-10 grid place-items-center rounded-full hover:bg-[#1A263D]" title="Indietro"><ChevronLeft className="w-5 h-5" /></button>
      <div className="min-w-0 flex-1 flex items-center gap-2">
        {editing ? (
          <input data-testid="play-name-input" autoFocus value={play.name} onChange={(e) => onRename(e.target.value)} onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} className="min-w-0 w-full max-w-xs h-9 px-2 rounded-lg bg-[#0B111C] border border-amber-500 text-base outline-none" />
        ) : (
          <button data-testid="play-name" onClick={() => setEditing(true)} className="min-w-0 truncate font-heading text-lg font-bold uppercase tracking-tight text-left hover:text-amber-300" title="Rinomina">{play.name || "Senza nome"}</button>
        )}
        {savedAt && <span data-testid="autosave-indicator" className="hidden md:flex items-center gap-1 text-[11px] text-emerald-400 shrink-0"><Check className="w-3.5 h-3.5" />Salvato</span>}
      </div>
      <div className="flex items-center rounded-full bg-[#0B111C] border border-[#1E293B] p-0.5 shrink-0" data-testid="court-mode-toggle">
        {[["half", "Metà"], ["full", "Intero"]].map(([m, l]) => (
          <button key={m} data-testid={`court-mode-${m}`} onClick={() => play.courtMode !== m && onChange({ ...play, courtMode: m })} className={`h-8 px-2.5 sm:px-3 rounded-full text-xs font-semibold ${play.courtMode === m ? "bg-amber-500 text-[#090D14]" : "text-slate-300"}`}>{l}</button>
        ))}
      </div>
      <div className="hidden sm:flex items-center gap-0.5">
        {VIS.map((v) => (
          <button key={v.k} data-testid={`toggle-visibility-${v.k}`} onClick={() => toggle(v.k)} title={`${hidden[v.k] ? "Mostra" : "Nascondi"} ${v.label}`} className={`h-9 px-2 rounded-full flex items-center gap-1.5 text-xs font-semibold hover:bg-[#1A263D] ${hidden[v.k] ? "text-slate-500" : "text-slate-200"}`}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: v.dot, opacity: hidden[v.k] ? 0.3 : 1 }} />
            {hidden[v.k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden lg:inline">{v.label}</span>
          </button>
        ))}
      </div>
      <button data-testid="open-defense-btn" onClick={onOpenDefense} className="h-9 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30 shrink-0" title="Motore difensivo"><Shield className="w-4 h-4" /><span className="hidden md:inline">Difesa</span></button>
      <button data-testid="undo-btn" onClick={onUndo} disabled={!canUndo} className="w-10 h-10 grid place-items-center rounded-full hover:bg-[#1A263D] disabled:opacity-30" title="Annulla"><Undo2 className="w-5 h-5" /></button>
      <button data-testid="redo-btn" onClick={onRedo} disabled={!canRedo} className="w-10 h-10 grid place-items-center rounded-full hover:bg-[#1A263D] disabled:opacity-30" title="Ripristina"><Redo2 className="w-5 h-5" /></button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button data-testid="editor-menu-btn" className="w-10 h-10 grid place-items-center rounded-full hover:bg-[#1A263D]" title="Altro"><EllipsisVertical className="w-5 h-5" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-[#131C2E] border-[#1E293B] text-slate-100 max-h-[75dvh] overflow-y-auto">
          <DropdownMenuItem data-testid="menu-add-offense" onClick={() => onAddPlayer("O")}><UserPlus className="w-4 h-4 mr-2 text-yellow-400" />Aggiungi attaccante</DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-add-defense" onClick={() => onAddPlayer("D")}><UserPlus className="w-4 h-4 mr-2 text-blue-400" />Aggiungi difensore</DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#1E293B]" />
          <DropdownMenuLabel className="text-xs text-slate-400">Visibilità</DropdownMenuLabel>
          {VIS.map((v) => (
            <DropdownMenuCheckboxItem key={v.k} data-testid={`menu-visibility-${v.k}`} checked={!hidden[v.k]} onCheckedChange={() => toggle(v.k)} onSelect={(e) => e.preventDefault()}>{v.label}</DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator className="bg-[#1E293B]" />
          <DropdownMenuLabel className="text-xs text-slate-400">Categoria</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={play.category} onValueChange={(category) => onChange({ ...play, category })}>
            {Object.entries(CATEGORIES).map(([k, l]) => (
              <DropdownMenuRadioItem key={k} value={k} data-testid={`menu-category-${k}`}>{l}</DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator className="bg-[#1E293B]" />
          <DropdownMenuLabel className="text-xs text-slate-400">Esporta</DropdownMenuLabel>
          <DropdownMenuItem data-testid="menu-export-video" onClick={onExportVideo}><Video className="w-4 h-4 mr-2" />Video dell'animazione</DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-export-png" onClick={() => deliver(phasePNG(play, phaseIndex, settings.playerSize), `${base}-fase-${phaseIndex + 1}.png`)}><ImageIcon className="w-4 h-4 mr-2" />Immagine fase corrente (PNG)</DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-export-sheet" onClick={() => deliver(framesSheetPNG(play, settings.playerSize), `${base}-fotogrammi.png`)}><Images className="w-4 h-4 mr-2" />Tavola di tutti i fotogrammi (PNG)</DropdownMenuItem>
          <DropdownMenuItem data-testid="menu-export-json" onClick={() => exportPlaysJSON([play], `${base}.json`)}><FileDown className="w-4 h-4 mr-2" />File schema (JSON)</DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#1E293B]" />
          <DropdownMenuItem data-testid="menu-duplicate-play" onClick={onDuplicatePlay}><Copy className="w-4 h-4 mr-2" />Duplica schema</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
