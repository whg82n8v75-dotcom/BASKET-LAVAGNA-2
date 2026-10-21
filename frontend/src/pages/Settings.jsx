import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Share, PlusSquare, Smartphone, HardDrive, Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { usePlays } from "@/lib/store";
import { exportPlaysJSON } from "@/lib/storage";
import { PageShell } from "@/components/common";

const Section = ({ title, children }) => (
  <section className="rounded-2xl bg-[#131C2E] border border-[#1E293B] p-4 sm:p-5">
    <h2 className="font-heading text-xl font-bold uppercase tracking-tight mb-4">{title}</h2>
    <div className="space-y-4">{children}</div>
  </section>
);

const Row = ({ label, sub, children }) => (
  <div className="flex items-center justify-between gap-4">
    <div><div className="text-sm font-medium">{label}</div>{sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}</div>
    {children}
  </div>
);

const Seg = ({ value, options, onChange, testid }) => (
  <div className="flex rounded-full bg-[#0B111C] border border-[#1E293B] p-0.5 shrink-0">
    {options.map(([v, l]) => (
      <button key={String(v)} data-testid={`${testid}-${v}`} onClick={() => onChange(v)} className={`h-8 px-3 rounded-full text-xs font-semibold ${value === v ? "bg-amber-500 text-[#090D14]" : "text-slate-300"}`}>{l}</button>
    ))}
  </div>
);

export default function SettingsPage() {
  const { settings: s, updateSettings, plays, clearAll } = usePlays();
  const [storage, setStorage] = useState(null);
  const [persisted, setPersisted] = useState(null);
  const [swReady, setSwReady] = useState(false);
  useEffect(() => {
    navigator.storage?.estimate?.().then(setStorage).catch(() => {});
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
    navigator.serviceWorker?.getRegistration().then((r) => setSwReady(!!r?.active));
  }, []);
  const kb = Math.round(new Blob([localStorage.getItem("btm.plays.v1") || ""]).size / 1024);

  return (
    <PageShell testid="settings-page" title="Impostazioni">
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Editor">
          <Row label="Campo predefinito" sub="Per i nuovi schemi">
            <Seg testid="setting-court" value={s.courtMode} onChange={(courtMode) => updateSettings({ courtMode })} options={[["half", "Metà"], ["full", "Intero"]]} />
          </Row>
          <Row label="Dimensione giocatori">
            <Seg testid="setting-size" value={s.playerSize} onChange={(playerSize) => updateSettings({ playerSize })} options={[[0.85, "S"], [1, "M"], [1.2, "L"]]} />
          </Row>
          <Row label="Mostra posizioni della fase precedente" sub="Sagome tratteggiate per orientarsi">
            <Switch className="data-[state=unchecked]:bg-slate-600" data-testid="setting-ghost" checked={s.ghost} onCheckedChange={(ghost) => updateSettings({ ghost })} />
          </Row>
          <Row label="Linee visibili durante la riproduzione">
            <Switch className="data-[state=unchecked]:bg-slate-600" data-testid="setting-lines" checked={s.showLines} onCheckedChange={(showLines) => updateSettings({ showLines })} />
          </Row>
          <Row label="Ripeti in loop di default">
            <Switch className="data-[state=unchecked]:bg-slate-600" data-testid="setting-loop" checked={s.loop} onCheckedChange={(loop) => updateSettings({ loop })} />
          </Row>
          <div>
            <div className="flex justify-between text-sm mb-2"><span>Durata predefinita di una fase</span><span className="font-mono text-amber-400">{s.duration.toFixed(1)}s</span></div>
            <Slider data-testid="setting-duration" min={0.5} max={4} step={0.1} value={[s.duration]} onValueChange={([duration]) => updateSettings({ duration })} />
          </div>
          <Row label="Velocità predefinita">
            <Seg testid="setting-speed" value={s.speed} onChange={(speed) => updateSettings({ speed })} options={[[0.5, "0.5x"], [1, "1x"], [1.5, "1.5x"], [2, "2x"]]} />
          </Row>
        </Section>

        <Section title="Installa su iPhone e iPad">
          <ol className="space-y-3 text-sm text-slate-300">
            <li className="flex gap-3"><Smartphone className="w-5 h-5 text-amber-400 shrink-0" />Apri questo indirizzo con <b>Safari</b>.</li>
            <li className="flex gap-3"><Share className="w-5 h-5 text-amber-400 shrink-0" />Tocca il pulsante <b>Condividi</b> (quadrato con freccia verso l'alto).</li>
            <li className="flex gap-3"><PlusSquare className="w-5 h-5 text-amber-400 shrink-0" />Scegli <b>Aggiungi alla schermata Home</b> e conferma con <b>Aggiungi</b>.</li>
          </ol>
          <p className="text-xs text-slate-400">Su Chrome/Edge desktop o Android usa l'icona "Installa" nella barra degli indirizzi. Dopo il primo caricamento l'app funziona anche offline.</p>
          <div className="text-xs font-mono text-slate-400" data-testid="sw-status">Cache offline: {swReady ? "attiva" : "in preparazione (ricarica una volta)"}</div>
        </Section>

        <Section title="Dati e backup">
          <Row label={`${plays.length} schemi salvati`} sub={`Archivio locale ~${kb} KB${storage?.quota ? ` · spazio disponibile ${Math.round(storage.quota / 1048576)} MB` : ""}${persisted ? " · archiviazione persistente" : ""}`}>
            <HardDrive className="w-5 h-5 text-slate-500" />
          </Row>
          <p className="text-xs text-slate-400">Gli schemi restano sul dispositivo anche dopo gli aggiornamenti dell'app. Su iPhone/iPad installa l'app sulla Home ed esporta periodicamente un backup JSON.</p>
          <button data-testid="settings-backup-btn" disabled={!plays.length} onClick={() => exportPlaysJSON(plays, `basket-tactics-backup-${new Date().toISOString().slice(0, 10)}.json`)} className="w-full h-11 rounded-full border border-[#334155] font-semibold flex items-center justify-center gap-2 hover:bg-[#1A263D] disabled:opacity-40"><Download className="w-4 h-4" />Esporta backup completo (JSON)</button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button data-testid="settings-clear-btn" disabled={!plays.length} className="w-full h-11 rounded-full border border-red-900/70 text-red-400 font-semibold hover:bg-red-950/40 disabled:opacity-40">Elimina tutti gli schemi</button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#131C2E] border-[#1E293B] text-slate-100">
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare tutti gli schemi?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">Consigliato esportare prima un backup. L'operazione non è reversibile.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent border-[#334155] text-slate-200 hover:bg-[#1A263D] hover:text-white">Annulla</AlertDialogCancel>
                <AlertDialogAction data-testid="settings-clear-confirm" className="bg-red-600 hover:bg-red-500" onClick={() => { clearAll(); toast("Tutti gli schemi sono stati eliminati"); }}>Elimina tutto</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Section>

        <Section title="Funzioni e limiti">
          <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">
            <li>Nessun login, nessun cloud, nessun abbonamento: tutto resta sul dispositivo.</li>
            <li>Internet serve solo per il primo caricamento (e per i font, poi memorizzati).</li>
            <li>Video: registrazione dell'animazione nel browser (MP4 su Safari, WebM su Chrome/Firefox).</li>
            <li>GIF animata non disponibile: in alternativa video o tavola dei fotogrammi PNG.</li>
          </ul>
        </Section>
      </div>
    </PageShell>
  );
}
