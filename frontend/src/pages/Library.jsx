import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { usePlays } from "@/lib/store";
import { getPresets } from "@/lib/presets";
import { PageShell, SearchInput, CategoryChips, PlayThumb, filterPlays, countByCat, CategoryBadge } from "@/components/common";

export function PresetCard({ preset }) {
  const navigate = useNavigate();
  const { copyPlay } = usePlays();
  const open = () => {
    const p = copyPlay(preset, preset.name);
    toast.success("Copia personale creata in \"I miei schemi\"");
    navigate(`/editor/${p.id}`);
  };
  return (
    <div data-testid={`preset-card-${preset.id}`} className="rounded-2xl overflow-hidden bg-[#131C2E] border border-[#1E293B] hover:border-[#334155] transition-colors flex flex-col">
      <button onClick={open} className="block w-full" data-testid={`preset-thumb-${preset.id}`}><PlayThumb play={preset} /></button>
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-center gap-2"><CategoryBadge category={preset.category} /><span className="font-mono text-[10px] text-slate-500">{preset.phases.length} fasi · {preset.courtMode === "full" ? "campo intero" : "metà campo"}</span></div>
        <div className="font-heading text-lg font-bold uppercase tracking-tight mt-2 leading-tight">{preset.name}</div>
        <p className="text-xs text-slate-400 mt-1 flex-1">{preset.description}</p>
        <button data-testid={`preset-open-${preset.id}`} onClick={open} className="mt-3 h-10 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-500 hover:text-[#090D14] transition-colors duration-200"><Pencil className="w-4 h-4" />Apri e modifica</button>
      </div>
    </div>
  );
}

export default function Library() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const presets = getPresets();
  const list = filterPlays(presets, q, cat);
  return (
    <PageShell testid="library-page" title="Libreria schemi">
      <p className="text-sm text-slate-400 mb-4">Ogni schema si apre come copia personale: puoi modificarlo, animarlo e salvarlo senza perdere l'originale.</p>
      <div className="space-y-3">
        <SearchInput value={q} onChange={setQ} testid="library-search-input" />
        <CategoryChips value={cat} onChange={setCat} counts={countByCat(presets)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-5" data-testid="library-grid">
        {list.map((p) => <PresetCard key={p.id} preset={p} />)}
      </div>
      {!list.length && <div className="mt-16 text-center text-slate-400" data-testid="library-empty">Nessuno schema trovato.</div>}
    </PageShell>
  );
}
