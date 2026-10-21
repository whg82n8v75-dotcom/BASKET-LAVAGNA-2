import { COURT } from "./court";

export const HOOP = { x: COURT.hoopX, y: 7.5 };
export const BALL_OFFSET = { x: 0.36, y: 0.36 };
export const PATH_TYPES = ["move", "offball", "dribble", "screen"];

export const EASINGS = {
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  linear: (t) => t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeIn: (t) => t * t,
};
export const EASING_LABELS = { easeInOut: "Morbida", linear: "Costante", easeOut: "Frenata", easeIn: "Accelerata" };

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function catmull(points, seg = 8) {
  if (points.length < 3) return points.map((p) => ({ x: p.x, y: p.y }));
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push({ x: f("x"), y: f("y") });
    }
  }
  const last = points[points.length - 1];
  out.push({ x: last.x, y: last.y });
  return out;
}

export function simplify(points, minDist = 0.4) {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) if (dist(points[i], out[out.length - 1]) >= minDist) out.push(points[i]);
  const last = points[points.length - 1];
  if (out.length > 1 && dist(out[out.length - 1], last) < minDist * 0.5) out.pop();
  out.push(last);
  return out;
}

const sampleCache = new WeakMap();
export function sampled(d) {
  if (!sampleCache.has(d.points)) sampleCache.set(d.points, catmull(d.points, 8));
  return sampleCache.get(d.points);
}

export function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

export function pointAlong(pts, f) {
  if (pts.length === 1) return pts[0];
  const target = pathLength(pts) * clamp(f, 0, 1);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (acc + d >= target) {
      const u = d ? (target - acc) / d : 0;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u };
    }
    acc += d;
  }
  return pts[pts.length - 1];
}

export function buildTimeline(play) {
  const segs = [];
  let t = 0;
  play.phases.forEach((ph, i) => {
    if (i > 0) {
      const d = Math.max(0.1, ph.duration);
      segs.push({ kind: "move", from: i - 1, to: i, start: t, dur: d });
      t += d;
    }
    const hold = i === 0 ? Math.max(0.5, ph.pause) : Math.max(0, ph.pause);
    segs.push({ kind: "hold", at: i, start: t, dur: hold });
    t += hold;
  });
  return { segs, total: t };
}

export const holdStart = (tl, i) => tl.segs.find((s) => s.kind === "hold" && s.at === i)?.start ?? 0;
export const moveStart = (tl, i) => tl.segs.find((s) => s.kind === "move" && s.to === i)?.start ?? 0;

export function visibleDrawings(play, i) {
  const out = [];
  play.phases.forEach((ph, k) => {
    if (k < i) ph.drawings.forEach((d) => d.persist && out.push(d));
    else if (k === i) out.push(...ph.drawings);
  });
  return out;
}

export function ballPos(phase, positions) {
  const h = phase.ball?.holder;
  if (h && positions[h]) return { x: positions[h].x + BALL_OFFSET.x, y: positions[h].y + BALL_OFFSET.y, holder: h };
  return { x: phase.ball?.x ?? 7, y: phase.ball?.y ?? 7.5, holder: null };
}

export function phaseScene(play, i) {
  const ph = play.phases[i];
  return { positions: ph.positions, ball: ballPos(ph, ph.positions), drawings: visibleDrawings(play, i), phaseIndex: i };
}

export function frameAt(play, tl, T, showLines = true) {
  const seg = tl.segs.find((s) => T < s.start + s.dur) || tl.segs[tl.segs.length - 1];
  if (seg.kind === "hold") {
    const sc = phaseScene(play, seg.at);
    return { ...sc, drawings: showLines ? sc.drawings : [], seg };
  }
  const A = play.phases[seg.from], B = play.phases[seg.to];
  const u = clamp((T - seg.start) / seg.dur, 0, 1);
  const e0 = (EASINGS[B.easing] || EASINGS.easeInOut)(u);
  const e = e0;
  const paths = {};
  A.drawings.forEach((d) => {
    if (d.playerId && PATH_TYPES.includes(d.type) && d.points.length > 1) paths[d.playerId] = sampled(d);
  });
  const positions = {};
  const dp = play.defense?.params;
  const defIds = dp ? new Set(play.players.filter((p) => p.team === "D").map((p) => p.id)) : null;
  const delay = dp ? 0.35 * dp.reaction : 0;
  const span = dp ? (1 - delay) * (1 - 0.4 * dp.rotSpeed) : 1;
  const eD = dp ? (EASINGS[B.easing] || EASINGS.easeInOut)(clamp((u - delay) / span, 0, 1)) : e;
  for (const pid of Object.keys({ ...A.positions, ...B.positions })) {
    const e = defIds?.has(pid) ? eD : e0;
    const a = A.positions[pid] || B.positions[pid], b = B.positions[pid] || a;
    const path = paths[pid];
    if (path) {
      const p = pointAlong(path, e), s0 = path[0], s1 = path[path.length - 1];
      positions[pid] = { x: p.x + (a.x - s0.x) * (1 - e) + (b.x - s1.x) * e, y: p.y + (a.y - s0.y) * (1 - e) + (b.y - s1.y) * e };
    } else positions[pid] = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
  }
  const bA = ballPos(A, positions), bB = ballPos(B, positions);
  let ball;
  if (bA.holder && bA.holder === bB.holder) ball = bA;
  else {
    const k = bA.holder && bB.holder ? EASINGS.easeInOut(clamp((u - 0.2) / 0.6, 0, 1)) : e;
    ball = { x: bA.x + (bB.x - bA.x) * k, y: bA.y + (bB.y - bA.y) * k, holder: null };
  }
  return { positions, ball, drawings: showLines ? visibleDrawings(play, seg.from) : [], phaseIndex: seg.from, seg, u };
}
