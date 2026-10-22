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
import { generateDefense, manualEdits, hasGenerated, DEFAULT_DEFENSE, liveDefensePhase, detectPnr, applyPnr, detectOffScreen, OFF_KINDS, guessKind, courtFrame } from "@/lib/defense";
import { PnrDock, covTags } from "@/components/editor/PnrDock";
import { LiveBar } from "@/components/editor/LiveBar";
import { CompareDialog } from "@/components/editor/CompareDialog";
import { PresentMode } from "@/components/editor/PresentMode";

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
  const [compareOpen, setCompareOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [pnrOpen, setPnrOpen] = useState(false);
  const setPnrPhase = (p, k, pnr) => ({ ...p, phases: p.phases.map((x, i) => (i === k ? (pnr ? { ...x, pnr } : (({ pnr: _, ...rest }) => rest)(x)) : x)) });
  const applyCov = (p0, which) => {
    const c = p0.phases[idx].pnr;
    let p = p0;
    which.forEach((r) => {
      const d = r === "B" ? c?.dB : c?.dS;
      if (d && p.phases[idx].locked?.[d]) p = M.setLock(p, idx, d, false);
    });
    return p.defense?.live ? react(p) : applyPnr(p, idx, cfgOf(p), which);
  };
  const pnrOps = {
    onDetect: () => {
      const p = playRef.current;
      const det = detectPnr(p, idx, cfgOf(p));
      commit(applyCov(setPnrPhase(p, idx, { ...det, aB: "over", aS: "show" }), ["B", "S"]));
      toast(det.S ? "Blocco rilevato: scegli le coperture dei due difensori" : "Nessun blocco disegnato: scegli bloccante e palleggiatore", { duration: 1800 });
    },
    onSet: (patch, which = ["B", "S"]) => {
      const p = playRef.current;
      let next = { ...p.phases[idx].pnr, ...patch };
      if (patch.S || patch.T) {
        const det = detectPnr(setPnrPhase(p, idx, null), idx, cfgOf(p));
        const assign = p.phases[idx].defInfo?.assign;
        const defOf = (o) => (assign && Object.keys(assign).find((d) => assign[d] === o)) || (o === det.T ? det.dB : o === det.S ? det.dS : null);
        if (patch.T) next.dB = defOf(patch.T) || next.dB;
        if (patch.S) next.dS = defOf(patch.S) || next.dS;
      }
      commit(applyCov(setPnrPhase(p, idx, next), which));
    },
    onReapply: () => commit(applyPnr(playRef.current, idx, cfgOf(playRef.current))),
    onRemove: () => commit(setPnrPhase(playRef.current, idx, null)),
  };
  const setOff = (p, list) => ({ ...p, phases: p.phases.map((x, i) => (i === idx ? { ...x, offScreens: list } : x)) });
  const applyIds = (p0, ids) => {
    let p = p0;
    ids.filter(Boolean).forEach((d) => {
      if (p.phases[idx].locked?.[d]) p = M.setLock(p, idx, d, false);
    });
    return p.defense?.live ? react(p) : applyPnr(p, idx, cfgOf(p), ids.filter(Boolean));
  };
  const offOps = {
    onAdd: () => {
      const p = playRef.current;
      const o = detectOffScreen(p, idx, cfgOf(p));
      commit(applyIds(setOff(p, [...(p.phases[idx].offScreens || []), o]), [o.dC, o.dS]));
      toast(o.S ? `Blocco lontano dalla palla rilevato (${OFF_KINDS[o.kind]})` : "Nessun blocco disegnato: scegli bloccante e tagliatore", { duration: 1800 });
    },
    onSet: (i, patch, ids) => {
      const p = playRef.current;
      const list = [...(p.phases[idx].offScreens || [])];
      const next = { ...list[i], ...patch };
      const assign = p.phases[idx].defInfo?.assign || {};
      const defOf = (o) => Object.keys(assign).find((d) => assign[d] === o);
      if (patch.C) next.dC = defOf(patch.C) || next.dC;
      if (patch.S) next.dS = defOf(patch.S) || next.dS;
      const ph = p.phases[idx];
      if ((patch.S || patch.C) && (next.kind || "other") === "other" && next.S && next.C && ph.positions[next.S] && ph.positions[next.C]) {
        const fr = courtFrame(p);
        const h = ph.ball?.holder && ph.positions[ph.ball.holder] ? ph.positions[ph.ball.holder] : { x: ph.ball?.x ?? 7, y: ph.ball?.y ?? 7.5 };
        next.kind = guessKind(fr.toN(ph.positions[next.C]), fr.toN(ph.positions[next.S]), fr.toN(h));
      }
      list[i] = next;
      commit(applyIds(setOff(p, list), ids || [next.dC, next.dS]));
    },
    onReapply: (i) => {
      const o = playRef.current.phases[idx].offScreens[i];
      commit(applyPnr(playRef.current, idx, cfgOf(playRef.current), [o.dC, o.dS].filter(Boolean)));
    },
    onRemove: (i) => commit(setOff(playRef.current, playRef.current.phases[idx].offScreens.filter((_, k) => k !== i))),
  };
  const canvasRef = useRef(null);
  const progressRef = useRef(null);
  const tRef = useRef(0);
  const stopAtRef = useRef(null);
  const pausedMid = useRef(false);
  const shownPhase = useRef(0);
  const idx = Math.min(cur, play.phases.length - 1);
  const tl = useMemo(() => buildTimeline(play), [play]);

  const liveOn = !!play.defense?.live;
  const cfgOf = (p) => ({ ...DEFAULT_DEFENSE, ...(p.defense || {}), params: { ...DEFAULT_DEFENSE.params, ...(p.defense?.params || {}) } });
  const react = (p, k = idx) => (p.defense?.live ? liveDefensePhase(p, k, cfgOf(p)) : p);
  const isDef = (id) => play.players.find((x) => x.id === id)?.team === "D";
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
        if (liveOn && isDef(a.id)) live(M.setLock(M.movePlayer(p, idx, a.id, a.pos, false), idx, a.id, true));
        else live(react(M.movePlayer(p, idx, a.id, a.pos, !liveOn)));
        break;
      case "moveBall":
        live(react(M.setBall(p, idx, { holder: null, x: a.pos.x, y: a.pos.y }, false)));
        break;
      case "setHolder":
        live(react(M.setBall(p, idx, { holder: a.id }, false)));
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
        commit(info === "created" ? react(np, idx + 1) : np);
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
    commit(react(M.insertPhaseAfter(play, idx, settings.duration), idx + 1));
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
    () => ({
      selectedId: sel?.kind === "player" ? sel.id : null, selectedDrawingId: sel?.kind === "drawing" ? sel.id : null, ghost, size: settings.playerSize,
      locked: play.phases[idx]?.locked,
      tags: covTags(play.phases[idx]),
      mismatch: Object.fromEntries((play.phases[idx]?.defInfo?.mismatches || []).map((m) => [m.d, m.kind])),
      smooth: liveOn ? { ids: play.players.filter((p) => p.team === "D").map((p) => p.id), tau: 0.18 + 0.5 * (play.defense?.params?.reaction ?? 0.3), preview: play.defense?.preview !== false } : null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sel, ghost, settings.playerSize, play.phases[idx]?.locked, play.phases[idx]?.defInfo, play.phases[idx]?.pnr, play.phases[idx]?.offScreens, liveOn, play.players, play.defense?.params?.reaction, play.defense?.preview],
  );
  const selPlayer = sel?.kind === "player" ? play.players.find((p) => p.id === sel.id) : null;
  const selDrawing = sel?.kind === "drawing" ? M.findDrawing(play, sel.id) : null;

  return (
    <div data-testid="editor-page" className="h-[100dvh] flex flex-col bg-[#090D14] text-slate-100 overflow-hidden select-none pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <EditorTopBar
        onPresent={() => { exitPlayback(); toast.dismiss(); setPresenting(true); }}
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
      <LiveBar
        play={play}
        phaseIndex={idx}
        onToggle={(on) => {
          exitPlayback();
          const p = { ...playRef.current, defense: { ...cfgOf(playRef.current), live: on } };
          commit(on ? react({ ...p, hidden: { ...(p.hidden || {}), D: false } }) : p);
          toast(on ? "Costruzione tattica live attiva: sposta attacco e palla, la difesa reagisce" : "Reazioni automatiche disattivate: gestione manuale", { duration: 1400 });
        }}
        onMode={(mode) => commit(react({ ...playRef.current, defense: { ...cfgOf(playRef.current), mode } }))}
        onReset={() => {
          commit(liveDefensePhase(M.clearLocks(playRef.current, idx), idx, cfgOf(playRef.current)));
          toast("Posizioni difensive ripristinate in questa fase", { duration: 1500 });
        }}
        onUnlockAll={() => commit(react(M.clearLocks(playRef.current, idx)))}
        onConfirm={() => {
          addPhase();
        }}
        onParams={() => {
          exitPlayback();
          setDefOpen(true);
        }}
        pnrOpen={pnrOpen}
        onPnr={() => setPnrOpen((o) => !o)}
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
              onGiveBall={() => commit(react(M.setBall(play, idx, { holder: selPlayer.id }, false)))}
              lockable={selPlayer.team === "D"}
              locked={!!play.phases[idx].locked?.[selPlayer.id]}
              onToggleLock={() => {
                const on = !play.phases[idx].locked?.[selPlayer.id];
                commit(on ? M.setLock(play, idx, selPlayer.id, true) : react(M.setLock(play, idx, selPlayer.id, false)));
                toast(on ? "Difensore bloccato: il motore non lo sposterà" : "Difensore sbloccato: torna automatico", { duration: 1500 });
              }}
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
        {pnrOpen && !playing && (
          <PnrDock
            play={play}
            idx={idx}
            onClose={() => setPnrOpen(false)}
            onPrev={() => goPhase(idx - 1)}
            onNext={() => goPhase(idx + 1)}
            onAdd={addPhase}
            onDuplicate={phaseOps.onDuplicate}
            onGo={goPhase}
            {...pnrOps}
            off={offOps}
          />
        )}
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
      <DefensePanel open={defOpen} onOpenChange={setDefOpen} play={play} phaseIndex={idx} onConfig={(defense) => live(react({ ...playRef.current, defense }))} onGenerate={onGenerate} onCompare={() => { setDefOpen(false); setCompareOpen(true); }} />
      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} play={play} />
      {presenting && <PresentMode play={play} startPhase={idx} playerSize={settings.playerSize} onClose={() => setPresenting(false)} />}
      <AlertDialog open={!!genAsk} onOpenChange={(o) => !o && setGenAsk(null)}>
        <AlertDialogContent data-testid="generate-confirm-dialog" className="bg-[#131C2E] border-[#1E293B] text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Generare la difesa?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {genAsk?.edits ? `Ci sono difensori posizionati a mano (o fasi nuove non ancora generate) in ${genAsk.edits} fase/i.` : "Le posizioni attuali dei difensori in tutte le fasi verranno sostituite."} Scegli come procedere.
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
