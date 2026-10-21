import { PATH_TYPES } from "./engine";

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const OFF_COLOR = "#FACC15";
export const DEF_COLOR = "#2563EB";
export const CATEGORIES = { attacco: "Attacco", difesa: "Difesa", rimesse: "Rimesse", transizione: "Transizione" };
export const PLAYER_COLORS = ["#FACC15", "#2563EB", "#EF4444", "#10B981", "#F97316", "#A855F7", "#F8FAFC", "#111827"];
export const DRAW_COLORS = ["#111827", "#DC2626", "#1D4ED8", "#F8FAFC", "#7C3AED", "#059669"];

export const hc = (lat, depth) => ({ x: depth, y: 7.5 + lat });
const eq = (a, b) => a && b && Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;

const DEFAULT_O = [[0, 9.4], [-5.2, 6.6], [5.2, 6.6], [-6.7, 1.3], [6.7, 1.3]];

export function defaultPlayers() {
  const ps = [];
  for (let n = 1; n <= 5; n++) ps.push({ id: "o" + n, team: "O", number: n, name: "", color: OFF_COLOR });
  for (let n = 1; n <= 5; n++) ps.push({ id: "d" + n, team: "D", number: n, name: "", color: DEF_COLOR });
  return ps;
}

export function makePhase(positions, ball, extra = {}) {
  return { id: uid(), duration: 1.6, pause: 0.5, easing: "easeInOut", positions, ball, drawings: [], ...extra };
}

export function createPlay({ name = "Nuovo schema", category = "attacco", courtMode = "half", duration = 1.6 } = {}) {
  const positions = {};
  DEFAULT_O.forEach(([lat, dep], i) => {
    positions["o" + (i + 1)] = hc(lat, dep);
    const k = i === 0 ? 0.16 : 0.24;
    positions["d" + (i + 1)] = hc(lat * (1 - k), dep + (1.575 - dep) * k);
  });
  const now = new Date().toISOString();
  return {
    id: uid(), name, category, courtMode, createdAt: now, updatedAt: now, description: "",
    players: defaultPlayers(), hidden: { O: false, D: false, ball: false },
    phases: [makePhase(positions, { holder: "o1" }, { duration })],
  };
}

const mapPhase = (play, i, fn) => ({ ...play, phases: play.phases.map((ph, k) => (k === i ? fn(ph) : ph)) });

export function movePlayer(play, i, id, pos) {
  const old = play.phases[i].positions[id];
  const phases = play.phases.map((ph) => ph);
  phases[i] = {
    ...phases[i],
    positions: { ...phases[i].positions, [id]: pos },
    drawings: phases[i].drawings.map((d) => {
      if (d.playerId === id && PATH_TYPES.includes(d.type)) return { ...d, points: [pos, ...d.points.slice(1)] };
      if (d.type === "pass" && d.fromId === id) return { ...d, points: [pos, d.points[d.points.length - 1]] };
      return d;
    }),
  };
  for (let k = i + 1; k < phases.length; k++) {
    if (!eq(phases[k].positions[id], old)) break;
    phases[k] = { ...phases[k], positions: { ...phases[k].positions, [id]: pos } };
  }
  if (i > 0) {
    phases[i - 1] = {
      ...phases[i - 1],
      drawings: phases[i - 1].drawings.map((d) => {
        if (d.playerId === id && PATH_TYPES.includes(d.type)) return { ...d, points: [...d.points.slice(0, -1), pos] };
        if (d.type === "pass" && d.toId === id) return { ...d, points: [d.points[0], pos] };
        return d;
      }),
    };
  }
  return { ...play, phases };
}

export function setBall(play, i, ball, propagate = true) {
  const oldHolder = play.phases[i].ball?.holder;
  const phases = play.phases.map((ph) => ph);
  phases[i] = { ...phases[i], ball };
  if (propagate)
    for (let k = i + 1; k < phases.length && phases[k].ball?.holder === oldHolder && oldHolder; k++) phases[k] = { ...phases[k], ball };
  return { ...play, phases };
}

export function newPhaseFrom(ph, duration) {
  return makePhase({ ...ph.positions }, { ...ph.ball }, { duration: duration ?? ph.duration, pause: ph.pause, easing: ph.easing });
}

export function addDrawing(play, i, drawing, duration) {
  const d = { persist: false, ...drawing, id: uid() };
  let next = mapPhase(play, i, (ph) => ({ ...ph, drawings: [...ph.drawings, d] }));
  let info = null;
  const linksMove = d.playerId && PATH_TYPES.includes(d.type);
  const linksPass = d.type === "pass" && d.fromId;
  if (linksMove || linksPass) {
    if (!next.phases[i + 1]) {
      next = { ...next, phases: [...next.phases, newPhaseFrom(next.phases[i], duration)] };
      info = "created";
    } else info = "updated";
    if (linksMove) next = movePlayer(next, i + 1, d.playerId, d.points[d.points.length - 1]);
    if (linksPass) {
      const end = d.points[d.points.length - 1];
      next = setBall(next, i + 1, d.toId ? { holder: d.toId } : { holder: null, x: end.x, y: end.y });
    }
  }
  return { play: next, info };
}

export function updateDrawing(play, id, patch) {
  return { ...play, phases: play.phases.map((ph) => ({ ...ph, drawings: ph.drawings.map((d) => (d.id === id ? { ...d, ...patch } : d)) })) };
}

export function removeDrawing(play, id) {
  return { ...play, phases: play.phases.map((ph) => ({ ...ph, drawings: ph.drawings.filter((d) => d.id !== id) })) };
}

export const findDrawing = (play, id) => play.phases.flatMap((ph) => ph.drawings).find((d) => d.id === id);

export function addPlayer(play, team, i) {
  const used = play.players.filter((p) => p.team === team).map((p) => p.number);
  let n = 1;
  while (used.includes(n)) n++;
  const id = team.toLowerCase() + uid();
  const base = play.phases[i].positions;
  const pos = team === "O" ? hc(-3 + (n % 4), 11) : hc(-3 + (n % 4), 4);
  const p = { id, team, number: n, name: "", color: team === "O" ? OFF_COLOR : DEF_COLOR };
  return {
    play: { ...play, players: [...play.players, p], phases: play.phases.map((ph) => ({ ...ph, positions: { ...ph.positions, [id]: base[id] || pos } })) },
    id,
  };
}

export function removePlayer(play, id) {
  return {
    ...play,
    players: play.players.filter((p) => p.id !== id),
    phases: play.phases.map((ph) => {
      const positions = { ...ph.positions };
      const old = positions[id];
      delete positions[id];
      const ball = ph.ball?.holder === id ? { holder: null, x: old?.x ?? 7, y: old?.y ?? 7.5 } : ph.ball;
      return { ...ph, positions, ball, drawings: ph.drawings.filter((d) => d.playerId !== id && d.fromId !== id && d.toId !== id) };
    }),
  };
}

export const updatePlayer = (play, id, patch) => ({ ...play, players: play.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
export const updatePhase = (play, i, patch) => mapPhase(play, i, (ph) => ({ ...ph, ...patch }));

export function insertPhaseAfter(play, i, duration) {
  const phases = [...play.phases];
  phases.splice(i + 1, 0, newPhaseFrom(play.phases[i], duration));
  return { ...play, phases };
}

export function duplicatePhase(play, i) {
  const src = play.phases[i];
  const copy = { ...src, id: uid(), positions: { ...src.positions }, drawings: src.drawings.map((d) => ({ ...d, id: uid() })) };
  const phases = [...play.phases];
  phases.splice(i + 1, 0, copy);
  return { ...play, phases };
}

export function deletePhase(play, i) {
  if (play.phases.length < 2) return play;
  return { ...play, phases: play.phases.filter((_, k) => k !== i) };
}

export function movePhase(play, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= play.phases.length) return play;
  const phases = [...play.phases];
  [phases[i], phases[j]] = [phases[j], phases[i]];
  return { ...play, phases };
}

export function clonePlay(play, name) {
  const now = new Date().toISOString();
  return { ...JSON.parse(JSON.stringify(play)), id: uid(), name: name ?? play.name, createdAt: now, updatedAt: now, presetId: play.presetId };
}

export function isValidPlay(p) {
  return p && typeof p === "object" && Array.isArray(p.players) && Array.isArray(p.phases) && p.phases.length > 0 && p.phases.every((ph) => ph.positions && Array.isArray(ph.drawings));
}
