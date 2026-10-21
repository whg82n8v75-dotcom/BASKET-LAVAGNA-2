import { defaultPlayers, makePhase, hc } from "./model";
import { HOOP } from "./engine";

const S = {
  top: [0, 9.4], ls: [-2.7, 8.7], rs: [2.7, 8.7], lw: [-5.2, 6.6], rw: [5.2, 6.6], lc: [-6.7, 1.3], rc: [6.7, 1.3],
  le: [-2.45, 5.8], re: [2.45, 5.8], lb: [-2.9, 2.3], rb: [2.9, 2.3], lsc: [-4.6, 1.5], rsc: [4.6, 1.5], rim: [0, 1.8], ft: [0, 5.9],
};
const OFF_ARROW = "#111827", DEF_ARROW = "#1D4ED8";

function manDefense(O, holder, press) {
  const D = {};
  const ball = O[holder];
  Object.keys(O).forEach((n) => {
    const o = O[n];
    const isBall = Number(n) === holder;
    const k = press ? (isBall ? 0.05 : 0.1) : isBall ? 0.15 : 0.27;
    let x = o.x + (HOOP.x - o.x) * k, y = o.y + (HOOP.y - o.y) * k;
    if (!isBall && ball) {
      const sag = press ? 0.08 : 0.16;
      x += (ball.x - o.x) * sag;
      y += (ball.y - o.y) * sag;
    }
    if (press && isBall) x -= 0.9;
    D[n] = { x, y };
  });
  return D;
}

function build(spec) {
  const conv = (v) => {
    const a = typeof v === "string" ? S[v] : v;
    return spec.world ? { x: a[0], y: a[1] } : hc(a[0], a[1]);
  };
  const O = {};
  let D = {};
  let holder = 1;
  const phases = spec.phases.map((ph) => {
    Object.entries(ph.O || {}).forEach(([n, v]) => (O[n] = conv(v)));
    if (ph.ball !== undefined) holder = ph.ball;
    if (spec.def === "man" || spec.def === "press") D = { ...manDefense(O, holder, spec.def === "press") };
    Object.entries(ph.D || {}).forEach(([n, v]) => (D[n] = conv(v)));
    const positions = {};
    for (let n = 1; n <= 5; n++) {
      positions["o" + n] = { ...O[n] };
      if (D[n]) positions["d" + n] = { ...D[n] };
    }
    const phase = makePhase(positions, { holder: "o" + holder }, { duration: ph.dur || 1.6, pause: ph.pause ?? 0.5, label: ph.label || "" });
    (ph.sym || []).forEach(([k, at]) => phase.drawings.push({ id: "s" + Math.random().toString(36).slice(2, 8), type: "symbol", kind: k, points: [conv(at)], persist: false }));
    (ph.zones || []).forEach(([c, rx, ry]) => {
      const p = conv(c);
      phase.drawings.push({ id: "z" + Math.random().toString(36).slice(2, 8), type: "zone", points: [{ x: p.x - ry, y: p.y - rx }, { x: p.x + ry, y: p.y + rx }], color: "#1D4ED8", persist: !!spec.persistZones });
    });
    return phase;
  });
  spec.phases.forEach((ph, i) => {
    if (!i) return;
    const prev = phases[i - 1], cur = phases[i];
    const ids = Object.keys(cur.positions).filter((id) => id[0] === "o" || spec.defArrows);
    ids.forEach((id) => {
      const a = prev.positions[id], b = cur.positions[id];
      if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) < 0.45) return;
      const n = id.slice(1);
      const off = id[0] === "o";
      let type = off ? "offball" : "move";
      if (off && (ph.screens || []).includes(Number(n))) type = "screen";
      else if (off && prev.ball.holder === id && cur.ball.holder === id) type = "dribble";
      else if (off && (ph.cuts || []).includes(Number(n))) type = "move";
      const via = off ? (ph.via || {})[n] : (ph.dvia || {})[n];
      prev.drawings.push({ id: "a" + id + i, type, points: [a, ...(via || []).map(conv), b], color: off ? OFF_ARROW : DEF_ARROW, playerId: id, persist: false });
    });
    if (prev.ball.holder !== cur.ball.holder) {
      const from = prev.ball.holder, to = cur.ball.holder;
      prev.drawings.push({ id: "p" + i, type: "pass", points: [prev.positions[from], cur.positions[to]], color: OFF_ARROW, fromId: from, toId: to, persist: false });
    }
  });
  const now = "2026-01-01T00:00:00.000Z";
  const players = defaultPlayers().filter((p) => p.team === "O" || phases[0].positions[p.id]);
  return {
    id: spec.id, presetId: spec.id, name: spec.name, category: spec.category, courtMode: spec.world ? "full" : "half", description: spec.desc,
    createdAt: now, updatedAt: now, players, hidden: { O: false, D: !!spec.hideD, ball: false }, phases,
  };
}

const SPECS = [
  {
    id: "five-out", name: "5-out motion offense", category: "attacco", def: "man",
    desc: "Spaziatura a 5 fuori: passa e taglia, riempimenti e nuovo taglio dal lato opposto.",
    phases: [
      { O: { 1: "top", 2: "lw", 3: "rw", 4: "lc", 5: "rc" }, ball: 1 },
      { ball: 2 },
      { O: { 1: [0.4, 2.0], 3: "top", 5: "rw" }, via: { 1: [[-1.2, 5.2]] }, cuts: [1] },
      { O: { 1: "rc" }, via: { 1: [[3.4, 1.4]] } },
      { ball: 3, O: { 4: "lw", 2: [-1.0, 2.2] }, via: { 2: [[-2.6, 4.6]] }, cuts: [2] },
      { O: { 2: "lc" }, via: { 2: [[-4.0, 1.2]] } },
    ],
  },
  {
    id: "pnr-center", name: "Pick and roll centrale", category: "attacco", def: "man",
    desc: "Blocco centrale del 5 per il playmaker, roll verso il canestro e passaggio al rollante.",
    phases: [
      { O: { 1: "top", 2: "lc", 3: "rc", 4: "lw", 5: "re" }, ball: 1 },
      { O: { 5: [0.9, 8.3] }, screens: [5], sym: [["B", [0.9, 7.4]]] },
      { O: { 1: [3.0, 6.4], 5: [0.6, 2.6], 4: "ls" }, via: { 1: [[1.9, 9.0]], 5: [[-0.6, 5.6]] }, cuts: [5], dur: 1.8 },
      { ball: 5, dur: 1.0 },
    ],
  },
  {
    id: "pnr-side", name: "Pick and roll laterale", category: "attacco", def: "man",
    desc: "Blocco laterale sulla fascia destra: penetrazione centrale, roll e scarico in angolo.",
    phases: [
      { O: { 1: "rw", 2: "lc", 3: "rc", 4: "ls", 5: "rb" }, ball: 1 },
      { O: { 5: [4.3, 6.9] }, screens: [5], sym: [["B", [3.6, 6.2]]] },
      { O: { 1: [1.2, 5.6], 5: [1.6, 2.2], 4: "top" }, via: { 1: [[3.6, 7.8]], 5: [[3.4, 4.0]] }, cuts: [5], dur: 1.8 },
      { ball: 3, dur: 1.0 },
    ],
  },
  {
    id: "handoff", name: "Handoff (consegnato)", category: "attacco", def: "man",
    desc: "Il playmaker palleggia verso l'ala e consegna la palla; l'ala attacca il centro.",
    phases: [
      { O: { 1: "top", 2: "lw", 3: "rw", 4: "lc", 5: "rb" }, ball: 1 },
      { O: { 1: [-3.4, 8.3], 2: [-5.4, 4.6] }, cuts: [2] },
      { O: { 2: [-3.0, 7.6], 1: "lw" }, ball: 2, via: { 2: [[-4.4, 7.4]] }, sym: [["H", [-3.2, 7.9]]], dur: 1.2 },
      { O: { 2: [-0.6, 4.6], 5: [1.6, 1.4] }, via: { 2: [[-1.6, 6.8]] }, dur: 1.4 },
    ],
  },
  {
    id: "pindown", name: "Uscita dai blocchi", category: "attacco", def: "man",
    desc: "Doppio blocco verso il basso (pin-down): i tiratori escono sulle ali per ricevere.",
    phases: [
      { O: { 1: "top", 2: "lb", 3: "rb", 4: "lw", 5: "rw" }, ball: 1 },
      { O: { 4: [-3.3, 3.8], 5: [3.3, 3.8] }, screens: [4, 5], sym: [["U", [-4.6, 4.8]]] },
      { O: { 2: "lw", 3: "rw" }, via: { 2: [[-4.0, 2.8]], 3: [[4.0, 2.8]] }, cuts: [2, 3], dur: 1.5 },
      { ball: 2, O: { 4: [-1.4, 1.8] }, dur: 1.0 },
    ],
  },
  {
    id: "flex", name: "Flex offense", category: "attacco", def: "man",
    desc: "Ribaltamento, blocco orizzontale (flex screen) sul fondo e blocco verso il basso per il bloccante.",
    phases: [
      { O: { 1: "rs", 2: "ls", 3: [6.2, 3.0], 4: [-6.2, 3.0], 5: "rb" }, ball: 1 },
      { ball: 2 },
      { O: { 5: [1.6, 2.0] }, screens: [5] },
      { O: { 3: [-1.8, 1.6] }, via: { 3: [[2.2, 1.1]] }, cuts: [3], sym: [["T", [0.2, 1.0]]] },
      { O: { 1: [2.4, 3.4] }, screens: [1] },
      { O: { 5: "rs" }, via: { 5: [[2.0, 4.6]] } },
      { ball: 5, dur: 1.0 },
    ],
  },
  {
    id: "horns", name: "Horns", category: "attacco", def: "man",
    desc: "Due lunghi ai gomiti, esterni negli angoli: pick and roll con il 5 e pop del 4.",
    phases: [
      { O: { 1: "top", 2: "lc", 3: "rc", 4: "le", 5: "re" }, ball: 1 },
      { O: { 5: [1.0, 8.4] }, screens: [5], sym: [["B", [1.0, 7.5]]] },
      { O: { 1: [3.0, 6.3], 5: [0.6, 2.4], 4: "ls" }, via: { 1: [[2.0, 9.1]], 5: [[0.2, 5.5]] }, cuts: [5], dur: 1.8 },
      { ball: 4, dur: 1.0 },
      { ball: 5, dur: 1.0 },
    ],
  },
  {
    id: "princeton", name: "Princeton offense", category: "attacco", def: "man",
    desc: "Lungo in post alto, passaggio in mezzo e taglio backdoor dell'ala anticipata.",
    phases: [
      { O: { 1: "rs", 2: "ls", 3: "lw", 4: "rw", 5: [0, 6.6] }, ball: 1 },
      { ball: 5 },
      { O: { 3: [-0.6, 1.7] }, via: { 3: [[-3.8, 3.4]] }, cuts: [3], sym: [["T", [-3.0, 2.6]]] },
      { ball: 3, O: { 2: "lw" }, dur: 1.0 },
    ],
  },
  {
    id: "transition", name: "Transizione offensiva", category: "transizione", def: "man", world: true,
    desc: "Rimbalzo, outlet, corsie esterne larghe, playmaker al centro e rimorchio del lungo.",
    phases: [
      { O: { 5: [26.0, 7.2], 1: [24.0, 2.8], 2: [21.0, 13.0], 3: [20.5, 2.0], 4: [25.0, 10.5] }, ball: 5 },
      { ball: 1, O: { 2: [15.0, 13.4], 3: [15.0, 1.6], 4: [22.5, 9.4] } },
      { O: { 1: [13.0, 7.5], 2: [5.0, 13.6], 3: [5.0, 1.4], 4: [16.0, 9.6], 5: [19.0, 7.2] }, via: { 1: [[19.0, 4.8]] }, dur: 2.0 },
      { O: { 1: [8.2, 7.5], 2: [1.4, 13.8], 3: [1.4, 1.3], 4: [10.5, 10.6], 5: [12.0, 7.0] }, dur: 1.6 },
      { ball: 4, O: { 5: [3.0, 8.6] }, via: { 5: [[7.0, 6.2]] }, cuts: [5], dur: 1.2 },
      { ball: 5, dur: 0.9 },
    ],
  },
  {
    id: "blob", name: "Rimessa da fondo (box)", category: "rimesse", def: "man",
    desc: "Schieramento a box: blocco verso il basso, uscita del 4 e taglio del 5 vicino al canestro.",
    phases: [
      { O: { 3: [-2.0, -0.6], 4: "lb", 5: "rb", 1: "le", 2: "re" }, ball: 3 },
      { O: { 1: [-2.2, 3.4], 2: "rc" }, screens: [1], sym: [["B", [-2.9, 3.0]]] },
      { O: { 4: [-1.0, 8.4], 5: [0.6, 1.2] }, via: { 4: [[-3.8, 4.6]], 5: [[1.4, 2.0]] }, cuts: [5] },
      { ball: 5, dur: 0.9 },
    ],
  },
  {
    id: "slob", name: "Rimessa laterale", category: "rimesse", def: "man",
    desc: "Rimessa dalla linea laterale: blocco per il playmaker, ricezione e ingresso del rimessista.",
    phases: [
      { O: { 2: [-8.0, 9.2], 1: [-2.4, 11.0], 5: "le", 4: [1.6, 9.6], 3: [-5.4, 3.0] }, ball: 2 },
      { O: { 4: [-1.4, 10.4], 3: "lc" }, screens: [4], sym: [["B", [-1.9, 9.8]]] },
      { O: { 1: [-5.6, 10.6] }, via: { 1: [[-1.0, 12.0]] }, cuts: [1] },
      { ball: 1, dur: 1.0 },
      { O: { 2: [-5.6, 7.0], 1: [-1.2, 9.6], 5: [1.2, 2.2] }, dur: 1.6 },
    ],
  },
  {
    id: "man-defense", name: "Difesa a uomo", category: "difesa", def: "man", defArrows: true,
    desc: "Posizionamento sulla linea palla-uomo-canestro, lato aiuto e scivolamenti a ogni passaggio.",
    phases: [
      { O: { 1: "top", 2: "lw", 3: "rw", 4: "lc", 5: "rc" }, ball: 1 },
      { ball: 2 },
      { ball: 4, sym: [["R", [1.4, 3.0]]] },
      { O: { 4: [-4.0, 0.7] }, D: { 5: [-2.6, 1.6], 3: [1.0, 2.4] }, dur: 1.2 },
    ],
  },
  {
    id: "zone-23", name: "Difesa a zona 2-3", category: "difesa", def: "zone", defArrows: true,
    desc: "Due guardie alte, tre giocatori bassi: scivolamenti sulla palla in ala e in angolo.",
    phases: [
      { O: { 1: "top", 2: "lw", 3: "rw", 4: "lc", 5: "rc" }, ball: 1, D: { 1: [-2.2, 7.3], 2: [2.2, 7.3], 3: [-3.6, 3.2], 4: [3.6, 3.2], 5: [0, 2.4] }, zones: [[[0, 4.6], 4.6, 3.4]] },
      { ball: 2, D: { 1: [-4.6, 6.0], 2: [-0.8, 6.2], 3: [-4.6, 2.6], 5: [-2.0, 2.0], 4: [1.2, 2.4] } },
      { ball: 4, D: { 3: [-5.8, 1.7], 5: [-2.6, 1.4], 1: [-3.8, 4.8], 2: [-1.0, 5.4], 4: [0.2, 2.2] }, sym: [["R", [0.6, 1.4]]] },
      { ball: 1, D: { 1: [-2.2, 7.3], 2: [2.2, 7.3], 3: [-3.6, 3.2], 4: [3.6, 3.2], 5: [0, 2.4] } },
      { ball: 3, D: { 2: [4.6, 6.0], 1: [0.8, 6.2], 4: [4.6, 2.6], 5: [2.0, 2.0], 3: [-1.2, 2.4] } },
    ],
  },
  {
    id: "zone-32", name: "Difesa a zona 3-2", category: "difesa", def: "zone", defArrows: true,
    desc: "Tre difensori alti e due bassi: pressione sul perimetro e chiusura dell'angolo dai lunghi.",
    phases: [
      { O: { 1: "top", 2: "lw", 3: "rw", 4: "lc", 5: "rc" }, ball: 1, D: { 1: [0, 8.0], 2: [-4.0, 6.2], 3: [4.0, 6.2], 4: [-2.3, 2.4], 5: [2.3, 2.4] }, zones: [[[0, 5.2], 4.8, 3.6]] },
      { ball: 2, D: { 2: [-4.6, 5.9], 1: [-1.8, 7.0], 3: [1.4, 5.6], 4: [-3.4, 2.6], 5: [0.4, 2.0] } },
      { ball: 4, D: { 4: [-5.8, 1.7], 5: [-2.2, 1.6], 2: [-4.0, 4.4], 1: [-1.6, 5.8], 3: [1.6, 3.0] }, sym: [["R", [0.6, 1.2]]] },
      { ball: 1, D: { 1: [0, 8.0], 2: [-4.0, 6.2], 3: [4.0, 6.2], 4: [-2.3, 2.4], 5: [2.3, 2.4] } },
    ],
  },
  {
    id: "full-press", name: "Pressing a tutto campo", category: "difesa", def: "press", defArrows: true, world: true,
    desc: "Pressione a uomo sulla rimessa, indirizzamento sulla linea laterale e raddoppio (trappola).",
    phases: [
      { O: { 1: [28.7, 9.0], 2: [24.5, 4.0], 3: [24.0, 11.2], 4: [19.5, 7.5], 5: [14.5, 8.5] }, ball: 1 },
      { ball: 2, O: { 1: [25.5, 8.6] } },
      { O: { 2: [20.6, 1.6] }, D: { 1: [21.4, 2.8], 2: [19.6, 2.2], 3: [19.6, 6.4], 4: [16.6, 4.6], 5: [11.0, 7.5] }, dvia: { 1: [[23.8, 5.6]] }, sym: [["B", [20.6, 3.4]]], dur: 2.0 },
    ],
  },
  {
    id: "pnr-defense", name: "Difesa sul pick and roll", category: "difesa", def: "man", defArrows: true,
    desc: "Show/hedge del lungo, il difensore sulla palla passa sopra il blocco e il lungo recupera sul rollante.",
    phases: [
      { O: { 1: "top", 2: "lc", 3: "rc", 4: "lw", 5: "re" }, ball: 1 },
      { O: { 5: [0.9, 8.3] }, screens: [5], D: { 5: [1.6, 7.8], 1: [0.1, 8.7] }, sym: [["B", [0.9, 7.4]]] },
      { O: { 1: [2.6, 7.6] }, via: { 1: [[1.8, 9.3]] }, D: { 5: [2.4, 8.4], 1: [1.8, 9.6] }, dvia: { 1: [[1.0, 9.9]] }, dur: 1.4 },
      { O: { 1: [3.4, 6.6], 5: [0.6, 3.2] }, via: { 5: [[0.4, 5.8]] }, cuts: [5], D: { 1: [2.7, 6.0], 5: [0.8, 3.9], 3: [2.2, 2.4] }, sym: [["R", [1.8, 4.6]]], dur: 1.6 },
    ],
  },
];

let cache = null;
export function getPresets() {
  if (!cache) cache = SPECS.map(build);
  return cache;
}
