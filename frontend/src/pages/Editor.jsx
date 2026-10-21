import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePlays } from "@/lib/store";
import { buildTimeline, frameAt, holdStart, moveStart, phaseScene } from "@/lib/engine";
import * as M from "@/lib/model";
import { CourtCanvas } from "@/components/editor/CourtCanvas";
import { Toolbar, TOOLS } from "@/components/editor/Toolbar";
import { Timeline } from "@/components/editor/Timeline";
import { PlayerPanel, DrawingPanel, ToolOptions } from "@/components/editor/Panels";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { ExportVideoDialog } from "@/components/editor/ExportVideoDialog";
import { DefensePanel } from "@/components/editor/DefensePanel";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { generateDefense, manualEdits, hasGenerated, DEFAULT_DEFENSE } from "@/lib/defense";

function Editor({ play }) {
  const { upsertPlay, settings, copyPlay } = usePlays();
  const navigate = useNavigate();
  const playRef = useRef(play);
  playRef.current = play;
  const [hist, setHist] = useState({ past: [], future: [] });
  const [cur, setCur] = useState(0);
  const [tool, setToolState] = useState("select");
  const [drawColor, setDrawColor] = useState("#111827");
  const [symbolKind, setSymbolKind] = useState("B");
  const [sel, setSel] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(settings.speed);
  const [loop, setLoop] = useState(settings.loop);
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [hint, setHint] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [defOpen, setDefOpen] = useState(false);
  const [genAsk, setGenAsk] = useState(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(null);
  const tRef = useRef(0);
  const stopAtRef = useRef(null);
  const pausedMid = useRef(false);
  const shownPhase = useRef(0);
  const idx = Math.min(cur, play.phases.length - 1);
  const tl = useMemo(() => buildTimeline(play), [play]);

  const live = useCallback((p) => {
    playRef.current = p;
    upsertPlay(p);
  }, [upsertPlay]);
  const pushHist = useCallback(() => {
    const snap = playRef.current;
    setHist((h) => ({ past: [...h.past.slice(-60), snap], future: [] }));
  }, []);
  const commit = useCallback((p) => {
    pushHist();
    live(p);
  }, [pushHist, live]);

  const undo = () => {
    if (!hist.past.length) return;
    const prev = hist.past[hist.past.length - 1];
    setHist({ past: hist.past.slice(0, -1), future: [playRef.current, ...hist.future] });
    live(prev);
    setSel(null);
  };
  const redo = () => {
    if (!hist.future.length) return;
    const [next, ...rest] = hist.future;
    setHist({ past: [...hist.past, playRef.current], future: rest });
    live(next);
    setSel(null);
  };

  const setProgress = (T) => {
    if (progressRef.current) progressRef.current.style.width = `${tl.total ? Math.min(100, (T / tl.total) * 100) : 0}%`;
  };

  const exitPlayback = useCallback(() => {
    setPlaying(false);
    pausedMid.current = false;
    stopAtRef.current = null;
    canvasRef.current?.clearOverride();
  }, []);

  useEffect(() => {
    if (!playing) setProgress(idx === play.phases.length - 1 && tRef.current >= tl.total - 0.01 ? tl.total : holdStart(tl, idx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, tl, playing]);

  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const step = (now) => {
      const dt = (Math.min(100, now - last) / 1000) * speed;
      last = now;
      let T = tRef.current + dt, done = false;
      if (stopAtRef.current != null && T >= stopAtRef.current) {
        T = stopAtRef.current;
        done = true;
      } else if (T >= tl.total) {
        if (loop) T = 0;
        else {
          T = tl.total;
          done = true;
        }
      }
      tRef.current = T;
      const fr = frameAt(playRef.current, tl, Math.min(T, tl.total - 1e-4), settings.showLines);
      canvasRef.current?.drawFrame(fr);
      setProgress(T);
      if (fr.phaseIndex !== shownPhase.current) {
        shownPhase.current = fr.phaseIndex;
        setCur(fr.phaseIndex);
      }
      if (done) {
        setPlaying(false);
        stopAtRef.current = null;
        pausedMid.current = false;
        setCur(fr.phaseIndex);
        canvasRef.current?.clearOverride();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, loop, tl, settings.showLines]);

  const onPlayPause = () => {
    if (playing) {
      setPlaying(false);
      pausedMid.current = true;
      return;
    }
    if (play.phases.length < 2) {
      toast("Aggiungi almeno una seconda fase per vedere l'animazione");
      return;
    }
    setSel(null);
    setPhaseOpen(false);
    if (!pausedMid.current) tRef.current = idx >= play.phases.length - 1 ? 0 : holdStart(tl, idx);
    if (tRef.current >= tl.total - 0.01) tRef.current = 0;
    shownPhase.current = -1;
    stopAtRef.current = null;
    pausedMid.current = false;
    setPlaying(true);
  };
  const goPhase = (i) => {
    exitPlayback();
    setSel(null);
    setCur(Math.max(0, Math.min(play.phases.length - 1, i)));
  };
  const onNext = () => {
    if (idx >= play.phases.length - 1) {
      toast("Sei all'ultima fase");
      return;
    }
    setSel(null);
    canvasRef.current?.clearOverride();
    tRef.current = moveStart(tl, idx + 1);
    stopAtRef.current = holdStart(tl, idx + 1);
    pausedMid.current = false;
    shownPhase.current = -1;
    setPlaying(true);
  };

  const setTool = (t) => {
    setToolState(t);
    setSel(null);
    setHint(TOOLS.find((x) => x.id === t)?.hint);
  };
  useEffect(() => {
    if (!hint) return;
    const h = setTimeout(() => setHint(null), 4500);
    return () => clearTimeout(h);
  }, [hint]);

  const onAction = (a) => {
    const p = playRef.current;
    switch (a.type) {
      case "interrupt":
        exitPlayback();
        break;
      case "beginLive":
        pushHist();
        break;
      case "movePlayer":
        live(M.movePlayer(p, idx, a.id, a.pos));
        break;
      case "moveBall":
        live(M.setBall(p, idx, { holder: null, x: a.pos.x, y: a.pos.y }, false));
        break;
      case "setHolder":
        live(M.setBall(p, idx, { holder: a.id }, false));
        break;
      case "selectPlayer":
        setSel({ kind: "player", id: a.id });
        break;
      case "selectDrawing":
        setSel({ kind: "drawing", id: a.id });
        break;
      case "deselect":
        setSel(null);
        break;
      case "addDrawing": {
        const { play: np, info } = M.addDrawing(p, idx, a.drawing, settings.duration);
        commit(np);
        if (info === "created") toast.success(`Creata la Fase ${idx + 2}: il movimento verrà animato`, { duration: 2000 });
        else if (info === "updated") toast(`Fase ${idx + 2} aggiornata con il nuovo movimento`, { duration: 1500 });
        break;
      }
      case "erase":
        commit(M.removeDrawing(p, a.id));
        break;
      default:
    }
  };

  const phaseOps = {
    onUpdate: (patch) => live(M.updatePhase(playRef.current, idx, patch)),
    onDuplicate: () => {
      commit(M.duplicatePhase(play, idx));
      setCur(idx + 1);
      setPhaseOpen(false);
    },
    onDelete: () => {
      commit(M.deletePhase(play, idx));
      setCur(Math.max(0, idx - 1));
      setPhaseOpen(false);
    },
    onMove: (dir) => {
      commit(M.movePhase(play, idx, dir));
      setCur(idx + dir);
    },
  };
  const addPhase = () => {
    exitPlayback();
    commit(M.insertPhaseAfter(play, idx, settings.duration));
    setCur(idx + 1);
    setSel(null);
    toast(`Fase ${idx + 2} creata: sposta i giocatori nelle nuove posizioni`, { duration: 1800 });
  };

  const runGenerate = (choice) => {
    const cfg = playRef.current.defense || DEFAULT_DEFENSE;
    setGenAsk(null);
    exitPlayback();
    if (choice === "copy") {
      const c = copyPlay(playRef.current, `${playRef.current.name} (difesa generata)`);
      upsertPlay(generateDefense(c, cfg).play);
      toast.success("Copia creata con la difesa generata");
      navigate(`/editor/${c.id}`);
      return;
    }
    const keep = choice === "keep" ? manualEdits(playRef.current) : {};
    commit(generateDefense(playRef.current, cfg, { keep }).play);
    toast.success(choice === "keep" ? "Difesa generata (modifiche manuali mantenute)" : "Difesa generata per tutte le fasi");
  };
  const onGenerate = () => {
    const edits = Object.keys(manualEdits(play)).length;
    const fresh = !hasGenerated(play) && play.players.some((p) => p.team === "D");
    if (edits || fresh) setGenAsk({ edits, fresh });
    else runGenerate("overwrite");
  };

  const addPlayer = (team) => {
    const { play: np, id } = M.addPlayer(play, team, idx);
    commit(np);
    setToolState("select");
    setSel({ kind: "player", id });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        document.querySelector('[data-testid="timeline-play"]')?.click();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        document.querySelector(`[data-testid="${e.shiftKey ? "redo-btn" : "undo-btn"}"]`)?.click();
      } else if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        document.querySelector('[data-testid="drawing-delete"], [data-testid="player-remove"]')?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  const scene = useMemo(() => phaseScene(play, idx), [play, idx]);
  const ghost = settings.ghost && idx > 0 ? play.phases[idx - 1].positions : null;
  const opts = useMemo(
    () => ({ selectedId: sel?.kind === "player" ? sel.id : null, selectedDrawingId: sel?.kind === "drawing" ? sel.id : null, ghost, size: settings.playerSize }),
    [sel, ghost, settings.playerSize],
  );
  const selPlayer = sel?.kind === "player" ? play.players.find((p) => p.id === sel.id) : null;
  const selDrawing = sel?.kind === "drawing" ? M.findDrawing(play, sel.id) : null;

  return (
    <div data-testid="editor-page" className="h-[100dvh] flex flex-col bg-[#090D14] text-slate-100 overflow-hidden select-none pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <EditorTopBar
        play={play}
        canUndo={hist.past.length > 0}
        canRedo={hist.future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onBack={() => navigate("/schemi")}
        onRename={(name) => live({ ...playRef.current, name })}
        onChange={commit}
        onAddPlayer={addPlayer}
        onExportVideo={() => {
          exitPlayback();
          setVideoOpen(true);
        }}
        phaseIndex={idx}
        onOpenDefense={() => {
          exitPlayback();
          setSel(null);
          setDefOpen(true);
        }}
        onDuplicatePlay={() => {
          const c = copyPlay(play, `${play.name} (copia)`);
          toast.success("Schema duplicato");
          navigate(`/editor/${c.id}`);
        }}
      />
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row">
        <div className="relative flex-1 min-h-0 min-w-0 order-1 landscape:order-2" data-testid="court-area">
          <CourtCanvas ref={canvasRef} play={play} scene={scene} tool={tool} drawColor={drawColor} symbolKind={symbolKind} opts={opts} interactive={!playing} onAction={onAction} />
          {!playing && <ToolOptions tool={tool} drawColor={drawColor} setDrawColor={setDrawColor} symbolKind={symbolKind} setSymbolKind={setSymbolKind} />}
          {selPlayer && !playing && (
            <PlayerPanel
              player={selPlayer}
              hasBall={play.phases[idx].ball?.holder === selPlayer.id}
              onChange={(patch) => live(M.updatePlayer(playRef.current, selPlayer.id, patch))}
              onGiveBall={() => commit(M.setBall(play, idx, { holder: selPlayer.id }, false))}
              onRemove={() => {
                commit(M.removePlayer(play, selPlayer.id));
                setSel(null);
              }}
              onClose={() => setSel(null)}
            />
          )}
          {selDrawing && !playing && (
            <DrawingPanel
              drawing={selDrawing}
              onChange={(patch) => commit(M.updateDrawing(play, selDrawing.id, patch))}
              onDelete={() => {
                commit(M.removeDrawing(play, selDrawing.id));
                setSel(null);
              }}
              onClose={() => setSel(null)}
            />
          )}
          {play.phases[idx]?.defInfo && !hint && (
            <div data-testid="defense-reading-chip" className="absolute left-2 bottom-2 z-10 pointer-events-none max-w-[calc(100%-16px)] truncate text-[11px] font-semibold text-blue-200 bg-[#090D14]/80 backdrop-blur rounded-full px-3 py-1.5 border border-blue-900/60">
              {play.defense?.mode === "man" ? "Uomo" : play.defense?.mode === "zone23" ? "Zona 2-3" : "Zona 3-2"} · palla: {play.phases[idx].defInfo.label}
            </div>
          )}
          {hint && !playing && (
            <div data-testid="tool-hint" className="absolute left-2 right-2 bottom-2 z-10 pointer-events-none text-[12px] text-slate-100 bg-[#090D14]/80 backdrop-blur rounded-xl px-3 py-2 border border-[#1E293B] animate-in fade-in duration-200">{hint}</div>
          )}
        </div>
        <div className="order-2 landscape:order-1 min-h-0 min-w-0 flex">
          <Toolbar tool={tool} setTool={setTool} />
        </div>
      </div>
      <Timeline
        phases={play.phases}
        current={idx}
        playing={playing}
        speed={speed}
        loop={loop}
        progressRef={progressRef}
        onSelect={goPhase}
        onPlayPause={onPlayPause}
        onRestart={() => {
          goPhase(0);
          tRef.current = 0;
        }}
        onPrev={() => goPhase(idx - 1)}
        onNext={onNext}
        onSpeed={setSpeed}
        onLoop={() => setLoop((l) => !l)}
        onAdd={addPhase}
        phaseOps={phaseOps}
        settingsOpen={phaseOpen}
        setSettingsOpen={setPhaseOpen}
      />
      <DefensePanel open={defOpen} onOpenChange={setDefOpen} play={play} phaseIndex={idx} onConfig={(defense) => live({ ...playRef.current, defense })} onGenerate={onGenerate} />
      <AlertDialog open={!!genAsk} onOpenChange={(o) => !o && setGenAsk(null)}>
        <AlertDialogContent data-testid="generate-confirm-dialog" className="bg-[#131C2E] border-[#1E293B] text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Generare la difesa?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {genAsk?.edits ? `Hai modificato a mano i difensori in ${genAsk.edits} fase/i dopo l'ultima generazione.` : "Le posizioni attuali dei difensori in tutte le fasi verranno sostituite."} Scegli come procedere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            {genAsk?.edits > 0 && <button data-testid="generate-keep-btn" onClick={() => runGenerate("keep")} className="h-11 rounded-full bg-emerald-600 text-white font-semibold">Genera mantenendo le modifiche manuali</button>}
            <button data-testid="generate-copy-btn" onClick={() => runGenerate("copy")} className="h-11 rounded-full border border-[#334155] font-semibold hover:bg-[#1A263D]">Crea una copia con la nuova difesa</button>
            <button data-testid="generate-overwrite-btn" onClick={() => runGenerate("overwrite")} className="h-11 rounded-full bg-blue-600 text-white font-semibold">Sovrascrivi i difensori</button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="generate-cancel-btn" className="bg-transparent border-[#334155] text-slate-200 hover:bg-[#1A263D] hover:text-white">Annulla</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ExportVideoDialog open={videoOpen} onOpenChange={setVideoOpen} play={play} speed={speed} size={settings.playerSize} />
    </div>
  );
}

export default function EditorPage() {
  const { id } = useParams();
  const { getPlay } = usePlays();
  const navigate = useNavigate();
  const play = getPlay(id);
  if (!play)
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#090D14] text-slate-200 p-6 text-center" data-testid="editor-not-found">
        <div>
          <div className="font-heading text-3xl font-extrabold uppercase">Schema non trovato</div>
          <button data-testid="editor-not-found-back" onClick={() => navigate("/schemi")} className="mt-6 h-11 px-5 rounded-full bg-amber-500 text-[#090D14] font-semibold">Vai ai miei schemi</button>
        </div>
      </div>
    );
  return <Editor key={id} play={play} />;
}
