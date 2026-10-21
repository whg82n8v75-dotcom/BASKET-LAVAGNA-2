import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CATEGORIES } from "@/lib/model";
import { usePlays } from "@/lib/store";

export function NewPlayDialog({ open, onOpenChange }) {
  const { newPlay, settings } = usePlays();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("attacco");
  const [mode, setMode] = useState(settings.courtMode);
  const create = () => {
    const p = newPlay({ name: name.trim() || "Nuovo schema", category, courtMode: mode });
    onOpenChange(false);
    navigate(`/editor/${p.id}`);
  };
  const chip = (active) => `h-11 rounded-xl text-sm font-semibold border transition-colors duration-150 ${active ? "bg-amber-500 text-[#090D14] border-amber-500" : "border-[#1E293B] text-slate-300 hover:bg-[#1A263D]"}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="new-play-dialog" className="bg-[#131C2E] border-[#1E293B] text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-tight">Nuovo schema</DialogTitle>
          <DialogDescription className="text-slate-400">Parti da 5 attaccanti e 5 difensori già in campo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input data-testid="new-play-name-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="Nome dello schema" className="w-full h-12 px-4 rounded-xl bg-[#0B111C] border border-[#1E293B] text-base outline-none focus:border-amber-500" />
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Categoria</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CATEGORIES).map(([k, l]) => (
                <button key={k} data-testid={`new-play-category-${k}`} onClick={() => setCategory(k)} className={chip(category === k)}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Campo</div>
            <div className="grid grid-cols-2 gap-2">
              <button data-testid="new-play-mode-half" onClick={() => setMode("half")} className={chip(mode === "half")}>Metà campo</button>
              <button data-testid="new-play-mode-full" onClick={() => setMode("full")} className={chip(mode === "full")}>Campo intero</button>
            </div>
          </div>
          <button data-testid="new-play-create-btn" onClick={create} className="w-full h-12 rounded-full bg-amber-500 text-[#090D14] font-bold text-base hover:bg-amber-400 transition-colors">Crea e apri l'editor</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
