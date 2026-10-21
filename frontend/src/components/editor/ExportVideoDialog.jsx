import { useEffect, useRef, useState } from "react";
import { Video, Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { recordPlay, pickMime, framesSheetPNG } from "@/lib/recorder";
import { shareOrDownload, safeName } from "@/lib/storage";

export function ExportVideoDialog({ open, onOpenChange, play, speed, size }) {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const abort = useRef(null);
  const supported = !!pickMime();

  useEffect(() => {
    if (!open) {
      abort.current?.abort();
      setStatus("idle");
      setProgress(0);
      setResult(null);
    }
  }, [open]);

  const start = async () => {
    if (play.phases.length < 2) {
      setStatus("error");
      return;
    }
    abort.current = new AbortController();
    setStatus("recording");
    setProgress(0);
    try {
      const r = await recordPlay(play, { speed, size, onProgress: (p) => setProgress(Math.round(p * 100)), signal: abort.current.signal });
      setResult(r);
      setStatus("done");
    } catch (e) {
      if (e.message !== "aborted") setStatus("error");
    }
  };

  const save = () => shareOrDownload(result.blob, `${safeName(play.name)}.${result.ext}`);
  const saveFrames = async () => shareOrDownload(await framesSheetPNG(play, size), `${safeName(play.name)}-fotogrammi.png`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="export-video-dialog" className="bg-[#131C2E] border-[#1E293B] text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-tight">Esporta video</DialogTitle>
          <DialogDescription className="text-slate-400">
            La riproduzione viene registrata direttamente sul dispositivo, senza Internet ({speed}x). Safari su iPhone/iPad produce MP4, Chrome/Firefox producono WebM.
          </DialogDescription>
        </DialogHeader>
        {!supported && <div data-testid="export-video-unsupported" className="text-sm text-amber-300">Questo browser non supporta la registrazione video. Puoi esportare la tavola dei fotogrammi in PNG.</div>}
        {status === "recording" && (
          <div className="space-y-2" data-testid="export-video-progress">
            <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin text-red-400" />Registrazione in corso… {progress}%</div>
            <Progress value={progress} />
          </div>
        )}
        {status === "error" && <div data-testid="export-video-error" className="text-sm text-red-400">{play.phases.length < 2 ? "Servono almeno due fasi per creare un video." : "Registrazione non riuscita su questo browser. Usa l'esportazione dei fotogrammi."}</div>}
        {status === "done" && <div data-testid="export-video-done" className="text-sm text-emerald-400">Video pronto ({result.ext.toUpperCase()}, {(result.blob.size / 1024 / 1024).toFixed(1)} MB).</div>}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {status === "done" ? (
            <button data-testid="export-video-save" onClick={save} className="flex-1 h-11 rounded-full bg-emerald-500 text-[#090D14] font-semibold flex items-center justify-center gap-2"><Download className="w-4 h-4" />Salva / condividi video</button>
          ) : (
            <button data-testid="export-video-start" disabled={!supported || status === "recording"} onClick={start} className="flex-1 h-11 rounded-full bg-red-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40"><Video className="w-4 h-4" />Avvia registrazione</button>
          )}
          <button data-testid="export-frames" onClick={saveFrames} className="flex-1 h-11 rounded-full border border-[#334155] font-semibold hover:bg-[#1A263D]">Fotogrammi PNG</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
