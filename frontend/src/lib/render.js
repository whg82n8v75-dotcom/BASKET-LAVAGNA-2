import { courtImage } from "./court";
import { sampled, BALL_OFFSET } from "./engine";

export const SYMBOLS = {
  B: { label: "Blocco", color: "#DC2626" },
  T: { label: "Taglio", color: "#7C3AED" },
  P: { label: "Penetrazione", color: "#EA580C" },
  U: { label: "Uscita dai blocchi", color: "#0891B2" },
  R: { label: "Rotazione difensiva", color: "#1D4ED8" },
  H: { label: "Consegnato (handoff)", color: "#059669" },
};

export function playerRadius(view, size = 1) {
  return Math.max(12, Math.min(26, view.s * 0.5)) * size;
}

function textColor(hex) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111827" : "#FFFFFF";
}

function trim(pts, startCut, endCut) {
  const cut = (arr, d) => {
    let acc = 0;
    for (let i = 1; i < arr.length; i++) {
      const seg = Math.hypot(arr[i].x - arr[i - 1].x, arr[i].y - arr[i - 1].y);
      if (acc + seg >= d) {
        const u = (d - acc) / seg;
        return [{ x: arr[i - 1].x + (arr[i].x - arr[i - 1].x) * u, y: arr[i - 1].y + (arr[i].y - arr[i - 1].y) * u }, ...arr.slice(i)];
      }
      acc += seg;
    }
    return arr.slice(-1);
  };
  let out = startCut > 0 ? cut(pts, startCut) : pts;
  if (endCut > 0) out = cut([...out].reverse(), endCut).reverse();
  return out;
}

function totalLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

function wavy(pts, amp, wave) {
  const out = [];
  const L = totalLen(pts);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (!seg) continue;
    const nx = -(b.y - a.y) / seg, ny = (b.x - a.x) / seg;
    for (let s = 0; s < seg; s += 2) {
      const d = acc + s;
      const taper = Math.min(1, (L - d) / 16, d / 6);
      const o = Math.sin((d / wave) * Math.PI * 2) * amp * Math.max(0, taper);
      out.push({ x: a.x + ((b.x - a.x) * s) / seg + nx * o, y: a.y + ((b.y - a.y) * s) / seg + ny * o });
    }
    acc += seg;
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function polyline(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

function endDir(pts) {
  const end = pts[pts.length - 1];
  for (let i = pts.length - 2; i >= 0; i--) {
    const dx = end.x - pts[i].x, dy = end.y - pts[i].y;
    const L = Math.hypot(dx, dy);
    if (L > 10 || i === 0) return L ? { x: dx / L, y: dy / L } : { x: 1, y: 0 };
  }
  return { x: 1, y: 0 };
}

function arrowHead(ctx, pts, size, open) {
  const e = pts[pts.length - 1], d = endDir(pts);
  const l = { x: e.x - d.x * size - d.y * size * 0.6, y: e.y - d.y * size + d.x * size * 0.6 };
  const r = { x: e.x - d.x * size + d.y * size * 0.6, y: e.y - d.y * size - d.x * size * 0.6 };
  ctx.beginPath();
  ctx.moveTo(l.x, l.y);
  ctx.lineTo(e.x, e.y);
  ctx.lineTo(r.x, r.y);
  if (open) ctx.stroke();
  else {
    ctx.closePath();
    ctx.fill();
  }
}

function tBar(ctx, pts, size) {
  const e = pts[pts.length - 1], d = endDir(pts);
  ctx.beginPath();
  ctx.moveTo(e.x - d.y * size, e.y + d.x * size);
  ctx.lineTo(e.x + d.y * size, e.y - d.x * size);
  ctx.stroke();
}

export function drawDrawing(ctx, view, d, R, selected) {
  const col = d.color || "#111827";
  const lw = Math.max(2.2, view.s * 0.085);
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (selected) {
    ctx.shadowColor = "#F59E0B";
    ctx.shadowBlur = 12;
  }
  if (d.type === "zone" || d.type === "zoneRect") {
    const [p, q] = d.points.map(view.toS);
    const x = Math.min(p.x, q.x), y = Math.min(p.y, q.y), w = Math.abs(p.x - q.x), h = Math.abs(p.y - q.y);
    ctx.beginPath();
    if (d.type === "zone") ctx.ellipse(x + w / 2, y + h / 2, w / 2 || 1, h / 2 || 1, 0, 0, Math.PI * 2);
    else ctx.roundRect ? ctx.roundRect(x, y, w, h, 8) : ctx.rect(x, y, w, h);
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([lw * 2.5, lw * 1.6]);
    ctx.stroke();
  } else if (d.type === "symbol") {
    const p = view.toS(d.points[0]);
    const sym = SYMBOLS[d.kind] || SYMBOLS.B;
    const r = Math.max(11, R * 0.72);
    ctx.fillStyle = sym.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 ${Math.round(r * 1.15)}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(d.kind, p.x, p.y + 1);
  } else {
    let pts = sampled(d).map(view.toS);
    if (pts.length < 2) {
      ctx.restore();
      return;
    }
    const linkedStart = d.playerId || d.fromId;
    const endCut = d.type === "pass" && d.toId ? R + 3 : 0;
    if (totalLen(pts) > (linkedStart ? R : 0) + endCut + 6) pts = trim(pts, linkedStart ? R * 0.85 : 0, endCut);
    const head = Math.max(9, lw * 3.6);
    if (d.type === "pass") ctx.setLineDash([lw * 2.6, lw * 2]);
    if (d.type === "offball") ctx.lineWidth = lw * 0.75;
    const body = d.type === "dribble" ? wavy(pts, lw * 1.8, Math.max(12, lw * 5)) : pts;
    polyline(ctx, body);
    ctx.setLineDash([]);
    if (d.type === "screen") {
      ctx.lineWidth = lw * 1.3;
      tBar(ctx, pts, head * 0.95);
    } else if (d.type !== "line") arrowHead(ctx, pts, head, d.type === "offball");
  }
  ctx.restore();
}

function drawPlayer(ctx, view, p, pos, R, { selected, holder, ghost, locked }) {
  const s = view.toS(pos);
  ctx.save();
  if (ghost) {
    ctx.globalAlpha = 0.28;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, R * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (holder) {
    ctx.shadowColor = "rgba(249,115,22,0.9)";
    ctx.shadowBlur = 14;
    ctx.strokeStyle = "#F97316";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, R + 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(s.x, s.y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.stroke();
  if (p.team === "D") {
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, R - 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = textColor(p.color);
  ctx.font = `800 ${Math.round(R * 1.15)}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(p.number), s.x, s.y + 1);
  if (p.name) {
    ctx.font = `600 ${Math.max(10, Math.round(R * 0.55))}px "Plus Jakarta Sans", sans-serif`;
    const tw = ctx.measureText(p.name).width + 10, th = Math.max(14, R * 0.75);
    ctx.fillStyle = "rgba(9,13,20,0.82)";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(s.x - tw / 2, s.y + R + 3, tw, th, th / 2) : ctx.rect(s.x - tw / 2, s.y + R + 3, tw, th);
    ctx.fill();
    ctx.fillStyle = "#F8FAFC";
    ctx.fillText(p.name, s.x, s.y + R + 3 + th / 2 + 1);
  }
  if (locked) {
    const lx = s.x + R * 0.78, ly = s.y - R * 0.78, r = Math.max(6, R * 0.42);
    ctx.fillStyle = "#F8FAFC";
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0B111C";
    ctx.fillRect(lx - r * 0.5, ly - r * 0.1, r, r * 0.7);
    ctx.strokeStyle = "#0B111C";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(lx, ly - r * 0.1, r * 0.33, Math.PI, 0);
    ctx.stroke();
  }
  if (selected) {
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, R + 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall(ctx, view, ball, R) {
  const s = view.toS(ball);
  const r = Math.max(7, R * 0.5);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = "#EA580C";
  ctx.beginPath();
  ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#18181B";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s.x - r, s.y);
  ctx.lineTo(s.x + r, s.y);
  ctx.moveTo(s.x, s.y - r);
  ctx.lineTo(s.x, s.y + r);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s.x - r * 1.25, s.y, r * 0.85, -0.9, 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s.x + r * 1.25, s.y, r * 0.85, Math.PI - 0.9, Math.PI + 0.9);
  ctx.stroke();
  ctx.restore();
}

export const isVisible = (play, p) => !(play.hidden || {})[p.team];

export function drawScene(ctx, view, play, scene, opts = {}) {
  const { selectedId, selectedDrawingId, draft, ghost, size = 1, title, locked } = opts;
  const R = playerRadius(view, size);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.drawImage(courtImage(view), 0, 0, view.w, view.h);
  scene.drawings.forEach((d) => drawDrawing(ctx, view, d, R, d.id === selectedDrawingId));
  if (draft) drawDrawing(ctx, view, draft, R, false);
  if (ghost)
    play.players.forEach((p) => {
      if (isVisible(play, p) && ghost[p.id]) drawPlayer(ctx, view, p, ghost[p.id], R, { ghost: true });
    });
  const holder = scene.ball?.holder;
  play.players.forEach((p) => {
    const pos = scene.positions[p.id];
    if (pos && isVisible(play, p)) drawPlayer(ctx, view, p, pos, R, { selected: p.id === selectedId, holder: holder === p.id && !play.hidden?.ball, locked: locked?.[p.id] });
  });
  if (scene.ball && !play.hidden?.ball) drawBall(ctx, view, scene.ball, R);
  if (title) {
    ctx.font = `700 ${Math.round(view.w / 34)}px "Barlow Condensed", sans-serif`;
    const tw = ctx.measureText(title).width + 24;
    const th = view.w / 34 + 14;
    ctx.fillStyle = "rgba(9,13,20,0.85)";
    ctx.fillRect(12, 12, tw, th);
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(12, 12, 4, th);
    ctx.fillStyle = "#F8FAFC";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(title, 24, 12 + th / 2 + 1);
  }
}

export function hitPlayer(play, scene, view, sp, size) {
  const R = playerRadius(view, size);
  let best = null, bd = Infinity;
  play.players.forEach((p) => {
    const pos = scene.positions[p.id];
    if (!pos || !isVisible(play, p)) return;
    const s = view.toS(pos);
    const d = Math.hypot(s.x - sp.x, s.y - sp.y);
    if (d < R + 8 && d < bd) {
      bd = d;
      best = p.id;
    }
  });
  return best;
}

export function hitBall(play, scene, view, sp, size) {
  if (!scene.ball || play.hidden?.ball) return false;
  const R = playerRadius(view, size);
  const s = view.toS(scene.ball);
  return Math.hypot(s.x - sp.x, s.y - sp.y) < Math.max(12, R * 0.6);
}

export function hitDrawing(scene, view, sp, size) {
  const R = playerRadius(view, size);
  for (let k = scene.drawings.length - 1; k >= 0; k--) {
    const d = scene.drawings[k];
    if (d.type === "symbol") {
      const p = view.toS(d.points[0]);
      if (Math.hypot(p.x - sp.x, p.y - sp.y) < R) return d.id;
    } else if (d.type === "zone" || d.type === "zoneRect") {
      const [p, q] = d.points.map(view.toS);
      const cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2, rx = Math.abs(p.x - q.x) / 2 + 6, ry = Math.abs(p.y - q.y) / 2 + 6;
      if (((sp.x - cx) / rx) ** 2 + ((sp.y - cy) / ry) ** 2 <= 1) return d.id;
    } else {
      const pts = sampled(d).map(view.toS);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
        const t = Math.max(0, Math.min(1, ((sp.x - a.x) * (b.x - a.x) + (sp.y - a.y) * (b.y - a.y)) / L2));
        if (Math.hypot(sp.x - (a.x + t * (b.x - a.x)), sp.y - (a.y + t * (b.y - a.y))) < 14) return d.id;
      }
    }
  }
  return null;
}

export { BALL_OFFSET };
