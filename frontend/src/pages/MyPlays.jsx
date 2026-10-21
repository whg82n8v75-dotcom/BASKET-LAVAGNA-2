import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload, Download, EllipsisVertical, Pencil, Copy, Trash2, FileDown, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlays } from "@/lib/store";
import { exportPlaysJSON, readPlaysFile, safeName } from "@/lib/storage";
import { PageShell, SearchInput, CategoryChips, PlayThumb, filterPlays, countByCat, CategoryBadge } from "@/components/common";
import { NewPlayDialog } from "@/components/NewPlayDialog";

function PlayCard({ play, onRename, onDelete }) {
  const navigate = useNavigate();
  const { copyPlay } = usePlays();
  const date = new Date(play.updatedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  return (
    <div data-testid={`play-card-${play.id}`} className="rounded-2xl overflow-hidden bg-[#131C2E] border border-[#1E293B] hover:border-[#334155] transition-colors">
      <button data-testid={`play-card-open-${play.id}`} onClick={() => navigate(`/editor/${play.id}`)} className="block w-full"><PlayThumb play={play} /></button>
      <div className="p-3 flex items-start gap-2">
        <button onClick={() => navigate(`/editor/${play.id}`)} className="flex-1 min-w-0 text-left">
          <div className="font-semibold truncate" data-testid={`play-card-name-${play.id}`}>{play.name}</div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap"><CategoryBadge category={play.category} /><span className="font-mono text-[10px] text-slate-500">{play.phases.length} fasi · {date}</span></div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid={`play-card-menu-${play.id}`} className="w-9 h-9 grid place-items-center rounded-full hover:bg-[#1A263D] shrink-0"><EllipsisVertical className="w-4 h-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#131C2E] border-[#1E293B] text-slate-100">
            <DropdownMenuItem data-testid="play-action-rename" onClick={() => onRename(play)}><Pencil className="w-4 h-4 mr-2" />Rinomina</DropdownMenuItem>
            <DropdownMenuItem data-testid="play-action-duplicate" onClick={() => { copyPlay(play, `${play.name} (copia)`); toast.success("Schema duplicato"); }}><Copy className="w-4 h-4 mr-2" />Duplica</DropdownMenuItem>
            <DropdownMenuItem data-testid="play-action-export" onClick={() => exportPlaysJSON([play], `${safeName(play.name)}.json`)}><FileDown className="w-4 h-4 mr-2" />Esporta JSON</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1E293B]" />
            <DropdownMenuItem data-testid="play-action-delete" onClick={() => onDelete(play)} className="text-red-400"><Trash2 className="w-4 h-4 mr-2" />Elimina</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function MyPlays() {
  const { plays, upsertPlay, deletePlay, importPlays } = usePlays();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [newOpen, setNewOpen] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef(null);
  const list = filterPlays([...plays].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")), q, cat);

  const onImport = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const imported = await readPlaysFile(f);
      importPlays(imported);
      toast.success(`${imported.length} schema/i importati`);
    } catch (err) {
      toast.error(`Importazione non riuscita: ${err.message}`);
    }
  };

  return (
    <PageShell
      testid="my-plays-page"
      title="I miei schemi"
      actions={
        <>
          <button data-testid="import-json-btn" onClick={() => fileRef.current.click()} className="h-10 px-3 rounded-full border border-[#1E293B] flex items-center gap-1.5 text-sm hover:bg-[#1A263D]" title="Importa JSON"><Upload className="w-4 h-4" /><span className="hidden sm:inline">Importa</span></button>
          <button data-testid="export-all-btn" disabled={!plays.length} onClick={() => exportPlaysJSON(plays, `basket-tactics-backup-${new Date().toISOString().slice(0, 10)}.json`)} className="h-10 px-3 rounded-full border border-[#1E293B] flex items-center gap-1.5 text-sm hover:bg-[#1A263D] disabled:opacity-40" title="Esporta tutti"><Download className="w-4 h-4" /><span className="hidden sm:inline">Esporta tutti</span></button>
          <button data-testid="my-plays-new-btn" onClick={() => setNewOpen(true)} className="h-10 px-4 rounded-full bg-amber-500 text-[#090D14] font-semibold flex items-center gap-1.5 text-sm"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Nuovo</span></button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} data-testid="import-json-input" />
        </>
      }
    >
      <div className="space-y-3">
        <SearchInput value={q} onChange={setQ} />
        <CategoryChips value={cat} onChange={setCat} counts={countByCat(plays)} />
      </div>
      {list.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-5" data-testid="my-plays-grid">
          {list.map((p) => <PlayCard key={p.id} play={p} onRename={setRenaming} onDelete={setDeleting} />)}
        </div>
      ) : (
        <div data-testid="my-plays-empty" className="mt-16 text-center text-slate-400">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-600" />
          <p className="mt-3">{plays.length ? "Nessuno schema corrisponde alla ricerca." : "Non hai ancora schemi. Creane uno o aprine uno dalla libreria."}</p>
        </div>
      )}

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent data-testid="rename-dialog" className="bg-[#131C2E] border-[#1E293B] text-slate-100 max-w-sm">
          <DialogHeader><DialogTitle className="font-heading text-2xl uppercase">Rinomina</DialogTitle></DialogHeader>
          {renaming && (
            <form onSubmit={(e) => { e.preventDefault(); upsertPlay({ ...renaming, name: e.target.elements.n.value.trim() || renaming.name }); setRenaming(null); toast.success("Schema rinominato"); }} className="space-y-3">
              <input name="n" data-testid="rename-input" autoFocus defaultValue={renaming.name} className="w-full h-12 px-4 rounded-xl bg-[#0B111C] border border-[#1E293B] text-base outline-none focus:border-amber-500" />
              <button data-testid="rename-save-btn" className="w-full h-11 rounded-full bg-amber-500 text-[#090D14] font-semibold">Salva</button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent data-testid="delete-dialog" className="bg-[#131C2E] border-[#1E293B] text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Lo schema verrà rimosso da questo dispositivo. L'operazione non è reversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel-btn" className="bg-transparent border-[#334155] text-slate-200 hover:bg-[#1A263D] hover:text-white">Annulla</AlertDialogCancel>
            <AlertDialogAction data-testid="delete-confirm-btn" className="bg-red-600 hover:bg-red-500 text-white" onClick={() => { deletePlay(deleting.id); toast("Schema eliminato"); }}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <NewPlayDialog open={newOpen} onOpenChange={setNewOpen} />
    </PageShell>
  );
}
