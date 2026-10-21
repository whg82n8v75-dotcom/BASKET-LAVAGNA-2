import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePlays } from "@/lib/store";
import { getPresets } from "@/lib/presets";
import { PageShell, SearchInput, PlayThumb, filterPlays, CategoryBadge } from "@/components/common";
import { PresetCard } from "./Library";

export default function SearchPage() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const { plays } = usePlays();
  const navigate = useNavigate();
  const mine = q.trim() ? filterPlays(plays, q, "all") : [];
  const lib = q.trim() ? filterPlays(getPresets(), q, "all") : [];
  return (
    <PageShell testid="search-page" title="Cerca schema">
      <SearchInput value={q} onChange={setQ} autoFocus testid="global-search-input" />
      {!q.trim() && <p className="text-slate-400 text-sm mt-6">Scrivi il nome di uno schema, per esempio "pick", "zona", "rimessa".</p>}
      {q.trim() && (
        <>
          <h2 className="font-heading text-xl font-bold uppercase mt-8 mb-3">I miei schemi <span className="font-mono text-sm text-slate-500">{mine.length}</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="search-results-mine">
            {mine.map((p) => (
              <button key={p.id} data-testid={`search-result-${p.id}`} onClick={() => navigate(`/editor/${p.id}`)} className="text-left rounded-2xl overflow-hidden bg-[#131C2E] border border-[#1E293B] hover:border-[#334155]">
                <PlayThumb play={p} />
                <div className="p-3"><div className="font-semibold text-sm truncate">{p.name}</div><div className="mt-1.5"><CategoryBadge category={p.category} /></div></div>
              </button>
            ))}
          </div>
          {!mine.length && <p className="text-sm text-slate-500">Nessun risultato.</p>}
          <h2 className="font-heading text-xl font-bold uppercase mt-8 mb-3">Libreria <span className="font-mono text-sm text-slate-500">{lib.length}</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="search-results-library">
            {lib.map((p) => <PresetCard key={p.id} preset={p} />)}
          </div>
          {!lib.length && <p className="text-sm text-slate-500">Nessun risultato.</p>}
        </>
      )}
    </PageShell>
  );
}
