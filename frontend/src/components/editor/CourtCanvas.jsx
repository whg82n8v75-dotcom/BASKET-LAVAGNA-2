import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { makeView } from "@/lib/court";
import { drawScene, hitBall, hitDrawing, hitPlayer } from "@/lib/render";
import { simplify, dist } from "@/lib/engine";

const FREEHAND = ["move", "offball", "dribble"];
const STRAIGHT = ["pass", "screen", "line"];
const BOX = ["zone", "zoneRect"];
const LINKABLE = ["move", "offball", "dribble", "screen", "pass"];

export const CourtCanvas = forwardRef(function CourtCanvas({ play, scene, tool, drawColor, symbolKind, opts, interactive, onAction }, ref) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const draftRef = useRef(null);
  const gesture = useRef(null);
  const overrideRef = useRef(null);
  const [fontsTick, setFontsTick] = useState(0);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }));
    ro.observe(wrapRef.current);
    document.fonts?.ready.then(() => setFontsTick((t) => t + 1));
    return () => ro.disconnect();
  }, []);

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const view = useMemo(() => (size.w > 10 && size.h > 10 ? makeView(size.w, size.h, play.courtMode, dpr) : null), [size, play.courtMode, dpr]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!view || !c) return;
    c.width = Math.round(view.w * dpr);
    c.height = Math.round(view.h * dpr);
  }, [view, dpr]);

  const disp = useRef({});
  const lastT = useRef(0);
  const rafRef = useRef(0);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const paintRef = useRef(null);
  const paint = useCallback(
    (sc) => {
      const c = canvasRef.current;
      if (!view || !c || !sc) return;
      let shown = sc;
      if (opts.smooth && !overrideRef.current) {
        const now = performance.now();
        const dt = lastT.current ? Math.min(0.05, (now - lastT.current) / 1000) : 0;
        lastT.current = now;
        const k = 1 - Math.exp(-dt / opts.smooth.tau);
        const pos = { ...sc.positions };
        const targets = {};
        let moving = false;
        opts.smooth.ids.forEach((id) => {
          const t = sc.positions[id], d = disp.current[id];
          if (!t) return;
          if (!d || id === gesture.current?.id) {
            disp.current[id] = { ...t };
            return;
          }
          let nx = d.x + (t.x - d.x) * k, ny = d.y + (t.y - d.y) * k;
          if (Math.hypot(t.x - nx, t.y - ny) > 0.02) moving = true;
          else {
            nx = t.x;
            ny = t.y;
          }
          disp.current[id] = { x: nx, y: ny };
          pos[id] = disp.current[id];
          if (opts.smooth.preview && Math.hypot(t.x - nx, t.y - ny) > 0.25) targets[id] = t;
        });
        shown = { ...sc, positions: pos, targets };
        cancelAnimationFrame(rafRef.current);
        if (moving) rafRef.current = requestAnimationFrame(() => paintRef.current?.(sceneRef.current));
        else lastT.current = 0;
      } else disp.current = { ...sc.positions };
      drawScene(c.getContext("2d"), view, play, shown, { ...opts, draft: draftRef.current });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, play, opts, fontsTick],
  );

  paintRef.current = paint;
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => {
    if (!overrideRef.current) paint(scene);
  }, [paint, scene]);

  useImperativeHandle(ref, () => ({
    drawFrame(sc) {
      overrideRef.current = sc;
      paint(sc);
    },
    clearOverride() {
      overrideRef.current = null;
      paint(scene);
    },
    hasOverride: () => !!overrideRef.current,
  }), [paint, scene]);

  const pt = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const size1 = opts.size;

  const onDown = (e) => {
    if (!view) return;
    if (!interactive) {
      onAction({ type: "interrupt" });
      return;
    }
    if (overrideRef.current) {
      overrideRef.current = null;
      onAction({ type: "interrupt" });
    }
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const sp = pt(e), wp = view.toW(sp.x, sp.y);
    if (tool === "select") {
      if (hitBall(play, scene, view, sp, size1)) gesture.current = { kind: "ball", start: sp, moved: false };
      else {
        const pid = hitPlayer(play, scene, view, sp, size1);
        if (pid) {
          const pos = scene.positions[pid];
          gesture.current = { kind: "player", id: pid, start: sp, moved: false, off: { x: wp.x - pos.x, y: wp.y - pos.y } };
        } else {
          const did = hitDrawing(scene, view, sp, size1);
          onAction(did ? { type: "selectDrawing", id: did } : { type: "deselect" });
          gesture.current = null;
        }
      }
    } else if (tool === "eraser") {
      const did = hitDrawing(scene, view, sp, size1);
      if (did) onAction({ type: "erase", id: did });
      gesture.current = { kind: "erase" };
    } else if (tool === "symbol") {
      onAction({ type: "addDrawing", drawing: { type: "symbol", kind: symbolKind, points: [wp] } });
    } else {
      let start = wp, playerId = null;
      const pid = LINKABLE.includes(tool) ? hitPlayer(play, scene, view, sp, size1) : null;
      if (pid) {
        start = scene.positions[pid];
        playerId = pid;
      }
      draftRef.current = { id: "draft", type: tool, points: [start, start], color: drawColor, playerId };
      gesture.current = { kind: "draw", start: sp };
    }
  };

  const onMove = (e) => {
    const g = gesture.current;
    if (!g || !view) return;
    const sp = pt(e), wp = view.toW(sp.x, sp.y);
    if (g.kind === "player" || g.kind === "ball") {
      if (!g.moved && Math.hypot(sp.x - g.start.x, sp.y - g.start.y) < 5) return;
      if (!g.moved) {
        g.moved = true;
        onAction({ type: "beginLive" });
      }
      if (g.kind === "player") onAction({ type: "movePlayer", id: g.id, pos: view.clampW({ x: wp.x - g.off.x, y: wp.y - g.off.y }) });
      else onAction({ type: "moveBall", pos: view.clampW(wp) });
    } else if (g.kind === "erase") {
      const did = hitDrawing(scene, view, sp, size1);
      if (did) onAction({ type: "erase", id: did });
    } else if (g.kind === "draw") {
      const d = draftRef.current;
      const p = view.clampW(wp);
      if (FREEHAND.includes(d.type)) {
        const pts = d.points.length === 2 && dist(d.points[0], d.points[1]) < 0.01 ? [d.points[0]] : d.points;
        if (dist(pts[pts.length - 1], p) >= 0.12) draftRef.current = { ...d, points: [...pts, p] };
      } else draftRef.current = { ...d, points: [d.points[0], p] };
      paint(scene);
    }
  };

  const onUp = (e) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !view) return;
    const sp = pt(e);
    if (g.kind === "player") {
      if (!g.moved) onAction({ type: "selectPlayer", id: g.id });
    } else if (g.kind === "ball" && g.moved) {
      const pid = hitPlayer(play, scene, view, sp, size1);
      onAction(pid ? { type: "setHolder", id: pid } : { type: "ballFree" });
    } else if (g.kind === "draw") {
      let d = draftRef.current;
      draftRef.current = null;
      const a = d.points[0], b = d.points[d.points.length - 1];
      const big = BOX.includes(d.type) ? Math.abs(a.x - b.x) > 0.3 && Math.abs(a.y - b.y) > 0.3 : dist(a, b) > 0.5;
      if (!big) {
        paint(scene);
        const pid = hitPlayer(play, scene, view, sp, size1);
        if (pid && Math.hypot(sp.x - g.start.x, sp.y - g.start.y) < 6) onAction({ type: "selectPlayer", id: pid });
        return;
      }
      if (FREEHAND.includes(d.type)) d = { ...d, points: simplify(d.points, 0.45) };
      if (d.type === "pass") {
        const to = hitPlayer(play, scene, view, sp, size1);
        d = { ...d, fromId: d.playerId, playerId: null, toId: to && to !== d.playerId ? to : null };
        if (d.toId) d.points = [d.points[0], scene.positions[d.toId]];
      }
      if (STRAIGHT.includes(d.type) || BOX.includes(d.type)) d.points = [d.points[0], d.points[d.points.length - 1]];
      const { id, ...rest } = d;
      onAction({ type: "addDrawing", drawing: rest });
    }
  };

  return (
    <div ref={wrapRef} className="absolute inset-0" data-testid="court-wrapper">
      <canvas
        ref={canvasRef}
        data-testid="court-canvas"
        className="block touch-none select-none"
        style={{ width: size.w, height: size.h, cursor: tool === "select" ? "grab" : "crosshair" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
});
