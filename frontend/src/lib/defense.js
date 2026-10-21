import { COURT } from "./court";
import { PATH_TYPES } from "./engine";

export const MODES = { man: "Difesa a uomo", zone23: "Zona 2-3", zone32: "Zona 3-2" };
export const STRATEGIES = {
  switch: "Cambio difensivo",
  over: "Passaggio sopra il blocco",
  under: "Passaggio sotto il blocco",
  contain: "Contenimento del lungo (drop)",
  show: "Show e recupero",
  help: "Aiuto e recupero",
  selective: "Cambio selettivo (per taglia)",
};
export const SIZES = { G: "Esterno", F: "Ala", C: "Lungo" };
const RANK = { G: 0, F: 1, C: 2 };
export const sizeOf = (p) => p?.size || (p?.number <= 2 ? "G" : p?.number === 3 ? "F" : "C");
export const PARAM_DEFS = [
  { k: "pressure", label: "Pressione sulla palla", lo: "Distanza", hi: "Aggressiva" },
  { k: "markDist", label: "Distanza di marcatura (senza palla)", lo: "Stretta", hi: "Larga" },
  { k: "depth", label: "Altezza della linea difensiva", lo: "Bassa", hi: "Alta" },
  { k: "rimProtect", label: "Priorità protezione del ferro", lo: "Bassa", hi: "Alta" },
  { k: "help", label: "Intensità degli aiuti", lo: "Leggeri", hi: "Forti" },
  { k: "spacing", label: "Distanza tra i difensori (zona)", lo: "Compatta", hi: "Larga" },
  { k: "rotSpeed", label: "Velocità di rotazione", lo: "Lenta", hi: "Rapida" },
  { k: "reaction", label: "Ritardo di reazione", lo: "Immediato", hi: "Ritardato" },
  { k: "recovery", label: "Intensità del recupero dopo l'aiuto", lo: "Parziale", hi: "Completo" },
];
export const DEFAULT_DEFENSE = {
  mode: "man", strategy: "switch", force: "baseline", preview: true, arrows: true, assign: {},
  params: { pressure: 0.6, markDist: 0.4, depth: 0.5, rimProtect: 0.6, help: 0.6, spacing: 0.5, rotSpeed: 0.5, reaction: 0.3, recovery: 0.7 },
};
export const ZONE_LABELS = { rim: "area del ferro", paint: "dentro l'area", post: "post basso", corner: "angolo", elbow: "gomito / media distanza", top: "punta", wing: "ala", backcourt: "metà campo difensiva" };
export const ROLE_LABELS = {
  zone23: { gL: "prima linea sinistra", gR: "prima linea destra", wL: "seconda linea sinistra", wR: "seconda linea destra", c: "centro" },
  zone32: { t: "punta", wL: "ala sinistra", wR: "ala destra", lL: "basso sinistro", lR: "basso destro" },
};
const ROLE_ORDER = { zone23: ["gL", "gR", "wL", "wR", "c"], zone32: ["t", "wL", "wR", "lL", "lR"] };

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const P = (lat, dep) => ({ lat, dep });
const add = (a, b) => P(a.lat + b.lat, a.dep + b.dep);
const sub = (a, b) => P(a.lat - b.lat, a.dep - b.dep);
const mul = (a, k) => P(a.lat * k, a.dep * k);
const len = (a) => Math.hypot(a.lat, a.dep);
const norm = (a) => {
  const l = len(a) || 1;
  return P(a.lat / l, a.dep / l);
};
const mix = (a, b, t) => P(lerp(a.lat, b.lat, t), lerp(a.dep, b.dep, t));
const HOOP = P(0, COURT.hoopX);
const hoopDist = (p) => len(sub(p, HOOP));
const toward = (from, to, d) => add(from, mul(norm(sub(to, from)), d));
const limit = (p, center, maxD) => (len(sub(p, center)) > maxD ? toward(center, p, maxD) : p);
const mirror = (p, s) => P(p.lat * s, p.dep);

export function courtFrame(play) {
  const ph = play.phases[play.phases.length - 1];
  const offs = play.players.filter((p) => p.team === "O" && ph.positions[p.id]);
  const right = play.courtMode === "full" && offs.length > 0 && offs.reduce((s, p) => s + ph.positions[p.id].x, 0) / offs.length > 14;
  return {
    right,
    toN: (p) => (right ? P(7.5 - p.y, COURT.L - p.x) : P(p.y - 7.5, p.x)),
    fromN: (n) => (right ? { x: COURT.L - n.dep, y: 7.5 - n.lat } : { x: n.dep, y: 7.5 + n.lat }),
  };
}

export function readBall(b) {
  const d = hoopDist(b), a = Math.abs(b.lat);
  let zone;
  if (b.dep > 14) zone = "backcourt";
  else if (d < 1.8) zone = "rim";
  else if (a <= 2.45 && b.dep <= 5.8) zone = a > 1.3 && b.dep < 3.8 ? "post" : "paint";
  else if (a < 4.3 && b.dep < 3.8) zone = "post";
  else if (a > 4.7 && b.dep < 3.4) zone = "corner";
  else if (d < 6.3 && a < 4.0) zone = "elbow";
  else if (a <= 2.6) zone = "top";
  else zone = "wing";
  const side = a < 1.2 ? 0 : Math.sign(b.lat);
  return { zone, side, d, inside: ["rim", "paint", "post"].includes(zone) };
}

const sideLabel = (s) => (s > 0 ? "destro" : s < 0 ? "sinistro" : "centrale");
const short = (play, id) => {
  const p = play.players.find((x) => x.id === id);
  return p ? `${p.team === "O" ? "A" : "D"}${p.number}` : "?";
};

function onBall(ball, prm, extra = 0) {
  const d = hoopDist(ball);
  const cush = Math.min(lerp(1.9, 0.75, prm.pressure) + extra, Math.max(0.5, d - 0.5));
  const p = toward(ball, HOOP, cush);
  const side = Math.sign(ball.lat) * smooth(1.2, 4, Math.abs(ball.lat));
  if (prm.force === "middle") {
    p.lat += side * 0.55;
    p.dep -= 0.3 * Math.abs(side);
  } else if (ball.dep > 3.4 || prm.force === "baseline") p.lat -= side * (prm.force === "baseline" ? 0.5 : 0.35);
  return p;
}

function detectEvents(play, k, fr, prevScreens) {
  const ev = { pass: null, dribble: false, penetration: false, cuts: new Set(), screensSet: [], screensUse: [] };
  if (k === 0) return ev;
  const A = play.phases[k - 1], B = play.phases[k];
  const hA = A.ball?.holder, hB = B.ball?.holder;
  const offs = play.players.filter((p) => p.team === "O" && B.positions[p.id] && A.positions[p.id]).map((p) => p.id);
  const nA = (id) => fr.toN(A.positions[id]), nB = (id) => fr.toN(B.positions[id]);
  if (hA && hB && hA !== hB) ev.pass = { from: hA, to: hB };
  if (hA && hA === hB && offs.includes(hA) && len(sub(nA(hA), nB(hA))) > 0.8) {
    ev.dribble = true;
    const d0 = hoopDist(nA(hA)), d1 = hoopDist(nB(hA));
    if (d1 < d0 - 1.0 && (d1 < 5.2 || readBall(nB(hA)).inside)) ev.penetration = true;
  }
  offs.forEach((id) => {
    if (id === hB) return;
    const d0 = hoopDist(nA(id)), d1 = hoopDist(nB(id));
    const drawn = A.drawings.some((d) => d.playerId === id && d.type === "move" && hoopDist(fr.toN(d.points[d.points.length - 1])) < 4.5);
    if ((len(sub(nA(id), nB(id))) > 1.5 && d1 < 4.0 && d1 < d0 - 1.5) || drawn) ev.cuts.add(id);
  });
  A.drawings.forEach((d) => {
    if (d.type !== "screen" || !d.playerId || !offs.includes(d.playerId)) return;
    const S = d.playerId, sp = nB(S);
    let T = null, best = 3.2;
    offs.forEach((id) => {
      if (id === S) return;
      const dd = len(sub(nB(id), sp));
      if (dd < best) {
        best = dd;
        T = id;
      }
    });
    if (T) ev.screensSet.push({ S, T, ball: T === hB, spot: sp });
  });
  prevScreens.forEach((sc) => {
    if (B.positions[sc.T] && len(sub(nA(sc.T), nB(sc.T))) > 1.0) ev.screensUse.push(sc);
  });
  return ev;
}

function manOff(A, ball, info, prm, isCutter) {
  const sag = 1 - prm.depth;
  if (isCutter) return add(A, add(mul(norm(sub(ball, A)), 0.9), mul(norm(sub(HOOP, A)), 0.35)));
  const dB = len(sub(A, ball));
  const strong = info.side === 0 || Math.abs(A.lat) < 1.2 || Math.sign(A.lat) === info.side;
  const onePass = dB < 7.2 && strong;
  if (hoopDist(A) < 3.6) {
    if (onePass) return toward(A, ball, 0.75);
    return mix(A, P(Math.sign(A.lat || 1) * 0.9, 1.9), 0.45 + 0.35 * prm.help);
  }
  if (onePass) {
    const md = lerp(0.8, 2.2, prm.markDist);
    return add(A, add(mul(norm(sub(HOOP, A)), md * (0.6 + 0.4 * sag)), mul(norm(sub(ball, A)), md * 0.55 * (1 - 0.5 * sag))));
  }
  let p = mix(A, ball, 0.3 + 0.25 * prm.help);
  p = mix(p, HOOP, 0.12 + 0.22 * sag + 0.15 * prm.rimProtect);
  const helpLat = Math.sign(A.lat || 1) * lerp(2.6, 0.6, prm.help);
  if (Math.abs(p.lat) > Math.abs(helpLat)) p.lat = lerp(p.lat, helpLat, 0.6);
  return limit(p, A, lerp(4.0, 6.5, prm.help));
}

function separate(pos, minD = 1.1) {
  const ids = Object.keys(pos);
  for (let it = 0; it < 4; it++)
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos[ids[i]], b = pos[ids[j]];
        const d = len(sub(a, b));
        if (d < minD) {
          const n = d > 0.01 ? norm(sub(a, b)) : P(1, 0);
          const push = (minD - d) / 2;
          pos[ids[i]] = add(a, mul(n, push));
          pos[ids[j]] = sub(b, mul(n, push));
        }
      }
  ids.forEach((id) => (pos[id] = P(clamp(pos[id].lat, -7.2, 7.2), Math.max(0.45, pos[id].dep))));
  return pos;
}

function manPhase(ctx) {
  const { play, ph, fr, ballN, holder, info, prm, ev, state, cfg } = ctx;
  const notes = [];
  const defs = Object.keys(state.assign);
  const out = {};
  const ballDef = defs.find((d) => state.assign[d] === holder);
  const nPos = (id) => fr.toN(ph.positions[id]);
  const normal = {};
  defs.forEach((d) => {
    const man = state.assign[d];
    if (!ph.positions[man]) return;
    const A = nPos(man);
    if (man === holder) normal[d] = onBall(ballN, prm, ev.penetration ? -0.4 : 0);
    else if (!holder) normal[d] = mix(A, ballN, 0.15);
    else normal[d] = manOff(A, ballN, info, prm, ev.cuts.has(man));
  });
  Object.assign(out, normal);
  const pickStrat = (dS, dT, sc, isSet) => {
    const tol = cfg.switchTol ?? 1;
    const z = (id) => sizeOf(play.players.find((x) => x.id === id));
    const lab = (id) => `${short(play, id)} (${SIZES[z(id)].toLowerCase()})`;
    const pairs = [[dS, sc.T], [dT, sc.S]];
    const bad = pairs.filter(([d, o]) => Math.abs(RANK[z(o)] - RANK[z(d)]) > tol);
    const small = pairs.filter(([d, o]) => RANK[z(o)] - RANK[z(d)] > tol);
    if (cfg.strategy === "switch" && isSet && small.length) small.forEach(([d, o]) => notes.push(`Attenzione: il cambio creerà un mismatch (${lab(d)} su ${lab(o)})`));
    if (cfg.strategy !== "selective") return cfg.strategy;
    const alt = cfg.mismatch || "over";
    const ok = !bad.length;
    notes.push(ok ? `Cambio selettivo: ${lab(dS)} su ${lab(sc.T)} e ${lab(dT)} su ${lab(sc.S)} → taglie compatibili, cambio` : `Cambio selettivo: il cambio lascerebbe ${bad.map(([d, o]) => `${lab(d)} su ${lab(o)}`).join(" e ")} → niente cambio, ${STRATEGIES[alt].toLowerCase()}`);
    return ok ? "switch" : alt;
  };
  const help = { helpers: [] };
  ev.screensSet.forEach((sc) => {
    const dS = defs.find((x) => state.assign[x] === sc.S), dT = defs.find((x) => state.assign[x] === sc.T);
    if (!dS || !dT) return;
    const strat = pickStrat(dS, dT, sc, true);
    const S = nPos(sc.S), T = nPos(sc.T);
    notes.push(`Blocco di ${short(play, sc.S)} per ${short(play, sc.T)}${sc.ball ? " (sulla palla)" : ""}: ${STRATEGIES[strat]}`);
    if (!sc.ball) return;
    const g = norm(sub(S, T)), toH = norm(sub(HOOP, S));
    const spots = {
      over: add(S, mul(toH, 1.2)), under: add(S, mul(toH, 1.0)), contain: mix(S, HOOP, 0.45),
      switch: add(S, add(mul(g, 0.4), mul(toH, 0.7))), show: add(S, add(mul(g, 0.9), mul(toH, -0.3))), help: add(S, add(mul(g, 0.6), mul(toH, 0.6))),
    };
    out[dS] = spots[strat];
    if (strat === "over") out[dT] = add(onBall(T, prm, -0.3), mul(norm(sub(S, T)), 0.5));
    if (strat === "under") out[dT] = onBall(T, prm, 0.6);
  });
  ev.screensUse.forEach((sc) => {
    const dS = defs.find((x) => state.assign[x] === sc.S), dT = defs.find((x) => state.assign[x] === sc.T);
    if (!dS || !dT || !ph.positions[sc.S]) return;
    const strat = pickStrat(dS, dT, sc);
    const T = nPos(sc.T), S = nPos(sc.S), spot = sc.spot;
    const trail = add(T, mul(norm(sub(spot, T)), 1.0));
    const under = toward(T, HOOP, 2.2);
    if (!sc.ball) {
      if (strat === "switch") {
        state.assign[dS] = sc.T;
        state.assign[dT] = sc.S;
        out[dS] = manOff(T, ballN, info, prm, false);
        out[dT] = manOff(S, ballN, info, prm, false);
        notes.push(`Cambio sul blocco senza palla: ${short(play, dS)} prende ${short(play, sc.T)}, ${short(play, dT)} prende ${short(play, sc.S)}`);
      } else {
        out[dT] = strat === "under" ? toward(T, HOOP, 1.5) : trail;
        out[dS] = mix(manOff(S, ballN, info, prm, false), T, 0.3);
        notes.push(`${short(play, dT)} insegue ${short(play, sc.T)} sull'uscita dal blocco, ${short(play, dS)} accenna l'aiuto`);
      }
      return;
    }
    const roller = S;
    const tagRoller = () => {
      const cands = defs.filter((d) => d !== dS && d !== dT && ph.positions[state.assign[d]]);
      let tg = null, bd = Infinity;
      cands.forEach((d) => {
        const dd = len(sub(out[d], roller));
        if (dd < bd) {
          bd = dd;
          tg = d;
        }
      });
      if (tg) {
        out[tg] = mix(out[tg], toward(roller, HOOP, 0.8), 0.3 + 0.4 * prm.help);
        help.helpers.push(tg);
        notes.push(`${short(play, tg)} tocca il rollante ${short(play, sc.S)} (tag)`);
      }
    };
    if (strat === "over") {
      out[dT] = trail;
      out[dS] = mix(onBall(T, prm, 0.4), manOff(roller, ballN, info, prm, true), 0.5);
      notes.push(`${short(play, dT)} passa sopra e insegue, ${short(play, dS)} contiene e torna sul rollante`);
    } else if (strat === "under") {
      out[dT] = under;
      out[dS] = manOff(roller, ballN, info, prm, true);
      notes.push(`${short(play, dT)} passa sotto il blocco, ${short(play, dS)} resta sul bloccante`);
    } else if (strat === "contain") {
      out[dT] = trail;
      out[dS] = mix(mix(T, HOOP, 0.55), roller, 0.25);
      notes.push(`${short(play, dS)} arretra (drop) tra palla e ferro, ${short(play, dT)} insegue da dietro`);
    } else if (strat === "switch") {
      state.assign[dS] = sc.T;
      state.assign[dT] = sc.S;
      out[dS] = onBall(T, prm);
      out[dT] = toward(roller, ballN, 0.7);
      notes.push(`Cambio: ${short(play, dS)} prende la palla, ${short(play, dT)} anticipa il rollante`);
    } else if (strat === "show") {
      out[dS] = add(toward(T, HOOP, 0.9), mul(norm(sub(T, spot)), 0.6));
      out[dT] = add(T, mul(norm(sub(spot, T)), 0.7));
      help.helpers.push(dS);
      tagRoller();
      notes.push(`Show di ${short(play, dS)} davanti alla palla, poi recupero sul bloccante`);
    } else if (strat === "help") {
      out[dS] = toward(T, HOOP, 1.4);
      out[dT] = under;
      help.helpers.push(dS);
      tagRoller();
      notes.push(`Aiuto di ${short(play, dS)} sulla penetrazione, ${short(play, dT)} rientra; poi recupero`);
    }
  });

  const ballDefNow = defs.find((d) => state.assign[d] === holder);
  const involved = new Set([...ev.screensSet, ...ev.screensUse].flatMap((sc) => [sc.S, sc.T]));
  const base = [];
  if (ballDefNow) base.push(`${short(play, ballDefNow)} sulla palla tra ${short(play, holder)} e canestro`);
  const onePass = [], helpSide = [];
  defs.forEach((d) => {
    const man = state.assign[d];
    if (d === ballDefNow || !ph.positions[man] || involved.has(man)) return;
    const A = nPos(man);
    const strong = info.side === 0 || Math.abs(A.lat) < 1.2 || Math.sign(A.lat) === info.side;
    (len(sub(A, ballN)) < 7.2 && strong ? onePass : helpSide).push(short(play, d));
  });
  if (onePass.length) base.push(`In anticipo (un passaggio): ${onePass.join(", ")}`);
  if (helpSide.length) base.push(`In aiuto sul lato debole: ${helpSide.join(", ")}`);
  ev.cuts.forEach((c) => {
    const d = defs.find((x) => state.assign[x] === c);
    if (d && !involved.has(c)) base.push(`${short(play, d)} reagisce al taglio di ${short(play, c)} (posizione palla-uomo)`);
  });

  notes.unshift(...base);
  if (ev.penetration && ballDef) {
    const spot = toward(ballN, HOOP, 1.1);
    const cands = defs.filter((d) => d !== ballDef && ph.positions[state.assign[d]]);
    const far = cands.filter((d) => len(sub(nPos(state.assign[d]), ballN)) > 4.5);
    const pool = far.length ? far : cands;
    let helper = null, bs = Infinity;
    pool.forEach((d) => {
      const weakLow = Math.sign(out[d].lat) !== Math.sign(ballN.lat) && out[d].dep < 4.5;
      const sc = len(sub(out[d], spot)) - (weakLow ? 1.5 : 0) - prm.rimProtect * (out[d].dep < 3 ? 1 : 0);
      if (sc < bs) {
        bs = sc;
        helper = d;
      }
    });
    const st = ctx.sticky?.find((d) => pool.includes(d));
    if (st && st !== helper) {
      const weakLow = Math.sign(out[st].lat) !== Math.sign(ballN.lat) && out[st].dep < 4.5;
      const sc = len(sub(out[st], spot)) - (weakLow ? 1.5 : 0) - prm.rimProtect * (out[st].dep < 3 ? 1 : 0);
      if (sc <= bs + 1.0) helper = st;
    }
    if (helper) {
      const hMan = state.assign[helper];
      out[helper] = mix(out[helper], spot, 0.45 + 0.55 * prm.help);
      help.helpers.push(helper);
      notes.push(`Penetrazione di ${short(play, holder)}: aiuto di ${short(play, helper)} davanti al ferro`);
      let rot = null, br = Infinity;
      cands.filter((d) => d !== helper).forEach((d) => {
        const dd = len(sub(out[d], nPos(hMan)));
        if (dd < br) {
          br = dd;
          rot = d;
        }
      });
      if (rot && prm.help > 0.25) {
        const tgt = mix(mix(nPos(state.assign[rot]), nPos(hMan), 0.5), HOOP, 0.3);
        out[rot] = mix(out[rot], tgt, 0.35 + 0.4 * prm.help);
        help.helpers.push(rot);
        notes.push(`Rotazione di ${short(play, rot)} tra ${short(play, state.assign[rot])} e ${short(play, hMan)} (aiuto sull'aiuto)`);
      }
      defs.forEach((d) => {
        if (d !== ballDef && !help.helpers.includes(d)) out[d] = mix(out[d], HOOP, 0.12 * prm.help);
      });
    }
  }

  if (state.prevHelp?.length && state.prevPos) {
    state.prevHelp.forEach((d) => {
      if (help.helpers.includes(d) || !state.prevPos[d] || !out[d]) return;
      out[d] = mix(state.prevPos[d], out[d], 0.45 + 0.55 * prm.recovery);
      notes.push(`Recupero di ${short(play, d)} su ${short(play, state.assign[d])}${state.assign[d] === holder ? " (closeout)" : ""}`);
    });
  }
  state.prevHelp = help.helpers;
  return { out, notes, helpers: help.helpers };
}

function zoneBase(mode, ball, info, prm, offN) {
  const w = lerp(0.85, 1.15, prm.spacing);
  const s = info.side || Math.sign(ball.lat) || 1;
  const topDep = lerp(6.1, 7.7, prm.depth);
  const weakLat = lerp(2.4, 0.9, prm.rimProtect);
  const bd = Math.min(ball.dep, 10);
  const cornerOcc = offN.some((p) => Math.sign(p.lat) === s && Math.abs(p.lat) > 4.8 && p.dep < 3.4);
  const highPost = offN.some((p) => Math.abs(p.lat) < 2 && p.dep > 4.4 && p.dep < 7);
  const ballG = onBall(P(ball.lat, bd), prm);
  const S = (rel) => mirror(rel, s);
  let F;
  if (mode === "zone23") {
    const top = {
      gL: P(ball.lat - 1.9 * w, clamp(bd - 1.5, topDep - 0.6, topDep + 0.8)), gR: P(ball.lat + 1.9 * w, clamp(bd - 1.5, topDep - 0.6, topDep + 0.8)),
      wL: P(-3.6 * w, 2.7), wR: P(3.6 * w, 2.7), c: P(ball.lat * 0.15, highPost ? 3.8 : 2.3),
    };
    const sideF = { gS: ballG, gW: S(P(0.7, topDep - 1.1)), wS: S(P((cornerOcc ? 5.0 : 4.3) * w, 2.5)), c: S(P(1.9, 2.0)), wW: S(P(-weakLat * w, 2.0)) };
    const cornerF = { wS: onBall(ball, prm), c: S(P(2.6, 1.6)), gS: S(P(4.0, 4.8)), gW: S(P(0.8, 5.0)), wW: S(P(-0.8, 1.8)) };
    const postF = { c: onBall(ball, prm, -0.5), wS: S(P(3.6, 2.8)), gS: S(P(3.0, 4.6)), gW: S(P(0.3, 5.0)), wW: S(P(-0.5, 1.8)) };
    const paintF = { c: P(0, 1.5 + 0.4 * (1 - prm.rimProtect)), wS: S(P(2.0, 2.2)), wW: S(P(-2.0, 2.2)), gS: S(P(2.6, 5.2)), gW: S(P(-2.6, 5.2)) };
    const map = (rel) => (s > 0 ? { gR: rel.gS, gL: rel.gW, wR: rel.wS, wL: rel.wW, c: rel.c } : { gL: rel.gS, gR: rel.gW, wL: rel.wS, wR: rel.wW, c: rel.c });
    F = { top, side: map(sideF), corner: map(cornerF), post: map(postF), paint: map(paintF), elbow: map({ ...paintF, c: onBall(ball, prm), gS: S(P(ball.lat * s + 1.3, ball.dep + 0.9)), gW: S(P(ball.lat * s - 1.3, ball.dep + 0.9)) }) };
  } else {
    const top = { t: ballG, wL: P(-4.0 * w, topDep - 1.2), wR: P(4.0 * w, topDep - 1.2), lL: P(-2.3 * w, 2.4), lR: P(2.3 * w, 2.4) };
    const sideF = { wS: ballG, t: S(P(1.4, topDep - 0.9)), wW: S(P(-1.2 * w, 5.4)), lS: S(P(3.2 * w, 2.2)), lW: S(P(-lerp(1.4, 0.3, prm.rimProtect), 2.0)) };
    const cornerF = { lS: onBall(ball, prm), lW: S(P(2.0, 1.7)), wS: S(P(4.0, 4.4)), t: S(P(1.2, 5.4)), wW: S(P(-1.2, 2.4)) };
    const postF = { lS: onBall(ball, prm, -0.5), lW: S(P(-0.6, 1.7)), wS: S(P(3.2, 4.2)), t: S(P(1.0, 5.6)), wW: S(P(-1.6, 4.2)) };
    const paintF = { lS: S(P(1.3, 1.6)), lW: S(P(-1.3, 1.6)), t: S(P(0.6, 5.0)), wS: S(P(3.0, 4.6)), wW: S(P(-3.0, 4.6)) };
    const map = (rel) => (s > 0 ? { wR: rel.wS, wL: rel.wW, lR: rel.lS, lL: rel.lW, t: rel.t } : { wL: rel.wS, wR: rel.wW, lL: rel.lS, lR: rel.lW, t: rel.t });
    F = { top, side: map(sideF), corner: map(cornerF), post: map(postF), paint: map(paintF), elbow: map({ ...paintF, t: onBall(ball, prm) }) };
  }
  const a = Math.abs(ball.lat);
  const fSide = smooth(1.2, 3.4, a);
  const fCorner = smooth(3.8, 2.4, ball.dep) * smooth(3.8, 5.0, a);
  const fIn = ball.dep > 14 ? 0 : smooth(6.6, 5.0, hoopDist(ball));
  const inside = info.zone === "post" ? F.post : info.zone === "elbow" ? F.elbow : F.paint;
  const out = {};
  Object.keys(F.top).forEach((r) => {
    let p = mix(F.top[r], F.side[r], fSide);
    p = mix(p, F.corner[r], fCorner);
    p = mix(p, inside[r], fIn);
    out[r] = p;
  });
  return out;
}

const ZONE_NOTES = {
  zone23: {
    top: "Prima linea contiene la punta e chiude le linee di passaggio; seconda linea protegge area, post e tagli",
    wing: "Il difensore di prima linea lato forte esce sulla palla, il compagno copre il centro; seconda linea lato forte copre angolo/lato basso, il centro protegge area e post, il lato debole si stringe verso il ferro",
    corner: "La seconda linea lato forte esce sul tiratore in angolo; il centro copre il post lato forte, la prima linea chiude la linea di passaggio all'ala e il centro, il lato debole protegge il ferro",
    post: "Il centro contiene il post basso, lato forte stringe (dig), il lato debole protegge il ferro",
    paint: "Palla in area: tutta la zona collassa, il centro protegge il ferro, la prima linea resta sulle linee di scarico",
    elbow: "Palla al gomito: il centro sale a contenere, la prima linea stringe dall'alto, il lato debole copre il ferro",
  },
  zone32: {
    top: "La punta pressa la palla, le ali negano i passaggi laterali, i due bassi proteggono ferro e post",
    wing: "L'ala lato forte esce sulla palla, la punta copre il gomito/centro, l'ala debole scende in lunetta; il basso lato forte è pronto sull'angolo, il basso debole protegge il ferro",
    corner: "Il basso lato forte esce sull'angolo, il basso debole scivola sul post lato forte, l'ala forte chiude il ritorno, la punta copre il centro, l'ala debole scende a proteggere il lato debole",
    post: "Il basso lato forte contiene il post, l'altro basso copre il ferro, l'ala forte raddoppia/stringe",
    paint: "Penetrazione: i due bassi proteggono il ferro, punta e ali collassano lasciando coperte le linee di scarico",
    elbow: "Palla al gomito: la punta contiene dall'alto, i bassi proteggono ferro e post",
  },
};

function runEngine(play, cfg, upto = play.phases.length - 1, sticky = null) {
  const fr = courtFrame(play);
  const prm = { ...DEFAULT_DEFENSE.params, ...cfg.params };
  const offs = play.players.filter((p) => p.team === "O");
  const defsP = play.players.filter((p) => p.team === "D").sort((a, b) => a.number - b.number);
  const assign = {};
  defsP.forEach((d) => {
    const forced = cfg.assign?.[d.id];
    const m = (forced && offs.find((o) => o.id === forced)) || offs.find((o) => o.number === d.number && !Object.values(assign).includes(o.id)) || offs.find((o) => !Object.values(assign).includes(o.id));
    if (m) assign[d.id] = m.id;
  });
  const roles = {};
  if (cfg.mode !== "man") Object.entries(zoneRoleMap(play, cfg.mode, cfg)).forEach(([r, d]) => (roles[d] = r));
  const state = { assign, prevHelp: [], prevPos: null, prevScreens: [] };
  const results = [];
  for (let k = 0; k <= upto; k++) {
    const ph = play.phases[k];
    const holder = ph.ball?.holder && ph.positions[ph.ball.holder] ? ph.ball.holder : null;
    const ballN = holder ? fr.toN(ph.positions[holder]) : fr.toN({ x: ph.ball?.x ?? 7, y: ph.ball?.y ?? 7.5 });
    const info = readBall(ballN);
    const ev = detectEvents(play, k, fr, state.prevScreens);
    if (holder && (info.zone === "paint" || info.zone === "rim")) ev.penetration = true;
    const evNotes = [];
    if (ev.pass) evNotes.push(`passaggio ${short(play, ev.pass.from)}→${short(play, ev.pass.to)}`);
    if (ev.penetration) evNotes.push(`penetrazione di ${short(play, holder)}`);
    else if (ev.dribble) evNotes.push(`palleggio di ${short(play, holder)}`);
    ev.cuts.forEach((c) => evNotes.push(`taglio di ${short(play, c)}`));
    ev.screensSet.forEach((sc) => evNotes.push(`blocco di ${short(play, sc.S)}`));
    ev.screensUse.forEach((sc) => evNotes.push(`uscita dal blocco di ${short(play, sc.T)}`));
    let outN, notes, helpers = [];
    if (cfg.mode === "man") {
      const prmMan = { ...prm, force: cfg.force || "baseline" };
      ({ out: outN, notes, helpers } = manPhase({ play, ph, fr, ballN, holder, info, prm: prmMan, ev, state, cfg, sticky: k === upto ? sticky : null }));
      if (holder && info.side) notes.push(prmMan.force === "middle" ? "Spinta: il difensore sulla palla chiude il fondo e indirizza verso il centro (aiuti pronti in mezzo)" : "Spinta: il difensore sulla palla chiude il centro e indirizza verso il fondo / linea laterale");
    } else {
      const offN = offs.filter((o) => ph.positions[o.id]).map((o) => fr.toN(ph.positions[o.id]));
      const base = zoneBase(cfg.mode, ballN, info, prm, offN);
      outN = {};
      Object.entries(roles).forEach(([d, r]) => (outN[d] = base[r]));
      if (info.inside) Object.keys(outN).forEach((d) => (outN[d] = mix(outN[d], ballN, 0.12 * prm.help)));
      if (holder && (info.zone === "paint" || info.zone === "rim")) {
        const rimRoles = cfg.mode === "zone23" ? ["c"] : ["lL", "lR"];
        const cont = Object.keys(outN).filter((d) => !rimRoles.includes(roles[d])).sort((a, b) => len(sub(outN[a], ballN)) - len(sub(outN[b], ballN)))[0];
        if (cont) outN[cont] = onBall(ballN, prm, -0.4);
      }
      const zk = info.zone === "rim" ? "paint" : info.zone === "backcourt" ? "top" : info.zone;
      notes = [ZONE_NOTES[cfg.mode][zk]];
      [...ev.screensSet, ...ev.screensUse].forEach((sc) => notes.push(`Blocco di ${short(play, sc.S)}: la zona non cambia, ogni difensore resta nella propria area e passa il giocatore al compagno`));
      const nearest = Object.keys(outN).sort((a, b) => len(sub(outN[a], ballN)) - len(sub(outN[b], ballN)))[0];
      if (nearest && !(info.zone === "top" && info.side === 0 && cfg.mode === "zone23")) notes.push(`Sulla palla: ${short(play, nearest)} (${ROLE_LABELS[cfg.mode][roles[nearest]]})`);
      Object.entries(roles).forEach(([d, r]) => notes.push(`${short(play, d)}: ${ROLE_LABELS[cfg.mode][r]}`));
    }
    separate(outN, cfg.mode === "man" ? 1.0 : 1.4);
    const mismatches = [];
    if (cfg.mode === "man")
      Object.entries(state.assign).forEach(([d, o]) => {
        const pd = play.players.find((x) => x.id === d), po = play.players.find((x) => x.id === o);
        if (!ph.positions[d] || !ph.positions[o]) return;
        const diff = RANK[sizeOf(po)] - RANK[sizeOf(pd)];
        if (Math.abs(diff) <= (cfg.switchTol ?? 1)) return;
        mismatches.push({ d, o, kind: diff > 0 ? "size" : "speed" });
        notes.push(diff > 0 ? `⚠ Mismatch fisico: ${short(play, d)} (${SIZES[sizeOf(pd)].toLowerCase()}) marca ${short(play, o)} (${SIZES[sizeOf(po)].toLowerCase()})` : `Mismatch di velocità: ${short(play, d)} (${SIZES[sizeOf(pd)].toLowerCase()}) marca ${short(play, o)} (${SIZES[sizeOf(po)].toLowerCase()})`);
      });
    const offPts = offs.filter((o) => ph.positions[o.id]).map((o) => fr.toN(ph.positions[o.id]));
    Object.keys(outN).forEach((d) => {
      offPts.forEach((o) => {
        const v = sub(outN[d], o);
        if (len(v) < 0.8) outN[d] = add(o, mul(len(v) > 0.01 ? norm(v) : norm(sub(HOOP, o)), 0.8));
      });
    });
    state.prevPos = outN;
    state.prevScreens = ev.screensSet;
    const gen = {};
    Object.entries(outN).forEach(([d, n]) => (gen[d] = fr.fromN(n)));
    const defInfo = { zone: info.zone, side: info.side, events: evNotes, notes, helpers, mismatches, mode: cfg.mode, label: `${ZONE_LABELS[info.zone]}${info.side ? ` · lato forte ${sideLabel(info.side)}` : ""}` };
    results.push({ gen, defInfo });
  }
  return { results, prm, defsP };
}

export function generateDefense(play, cfg = DEFAULT_DEFENSE, { keep = {} } = {}) {
  const { results, prm, defsP } = runEngine(play, cfg);
  const report = results.map((r) => r.defInfo);
  const phases = play.phases.map((ph, k) => {
    const { gen, defInfo } = results[k];
    const positions = { ...ph.positions };
    Object.entries(gen).forEach(([d, p]) => {
      if (!keep[k]?.includes(d) && !ph.locked?.[d]) positions[d] = p;
    });
    return { ...ph, positions, defGen: gen, defInfo };
  });
  const defIds = new Set(defsP.map((d) => d.id));
  const cleaned = phases.map((ph) => ({ ...ph, drawings: ph.drawings.filter((d) => !d.gen && !(defIds.has(d.playerId) && PATH_TYPES.includes(d.type))) }));
  if (cfg.arrows)
    cleaned.forEach((ph, k) => {
      if (!k) return;
      const prev = cleaned[k - 1];
      defIds.forEach((d) => {
        const a = prev.positions[d], b = ph.positions[d];
        if (a && b && Math.hypot(a.x - b.x, a.y - b.y) > 1.0) prev.drawings.push({ id: `g${d}${k}${Math.random().toString(36).slice(2, 6)}`, type: "move", color: "#1D4ED8", playerId: d, gen: true, persist: false, points: [a, b] });
      });
      (ph.defInfo.helpers || []).forEach((d) => {
        const p = ph.positions[d];
        if (p) ph.drawings.push({ id: `gr${d}${k}`, type: "symbol", kind: "R", gen: true, persist: false, points: [{ x: p.x + 0.9, y: p.y - 0.9 }] });
      });
    });
  return { play: { ...play, defense: { ...cfg, params: prm }, hidden: { ...(play.hidden || {}), D: false }, phases: cleaned }, report };
}

export function manualEdits(play) {
  const out = {};
  const any = play.phases.some((ph) => ph.defGen);
  const defIds = play.players.filter((p) => p.team === "D").map((p) => p.id);
  play.phases.forEach((ph, k) => {
    if (!ph.defGen) {
      if (any && defIds.some((d) => ph.positions[d])) out[k] = defIds.filter((d) => ph.positions[d]);
      return;
    }
    const ids = Object.keys(ph.defGen).filter((d) => ph.positions[d] && Math.hypot(ph.positions[d].x - ph.defGen[d].x, ph.positions[d].y - ph.defGen[d].y) > 0.05);
    if (ids.length) out[k] = ids;
  });
  return out;
}

export const hasGenerated = (play) => play.phases.some((ph) => ph.defGen);

export function liveDefensePhase(play, k, cfg = DEFAULT_DEFENSE) {
  const ph = play.phases[k];
  if (!ph) return play;
  const { results } = runEngine(play, { ...DEFAULT_DEFENSE, ...cfg }, k, ph.defInfo?.helpers || null);
  const { gen, defInfo } = results[k];
  const positions = { ...ph.positions };
  Object.entries(gen).forEach(([d, p]) => {
    if (!ph.locked?.[d]) positions[d] = p;
  });
  return { ...play, phases: play.phases.map((x, i) => (i === k ? { ...ph, positions, defGen: gen, defInfo } : x)) };
}

export function zoneRoleMap(play, mode, cfg = {}) {
  const defs = play.players.filter((p) => p.team === "D").sort((a, b) => a.number - b.number).map((p) => p.id);
  const custom = cfg.zoneRoles?.[mode] || {};
  const map = {};
  const used = new Set();
  ROLE_ORDER[mode].forEach((r) => {
    if (custom[r] && defs.includes(custom[r]) && !used.has(custom[r])) {
      map[r] = custom[r];
      used.add(custom[r]);
    }
  });
  ROLE_ORDER[mode].forEach((r) => {
    if (map[r]) return;
    const d = defs.find((x) => !used.has(x));
    if (d) {
      map[r] = d;
      used.add(d);
    }
  });
  return map;
}
export { ROLE_ORDER };
