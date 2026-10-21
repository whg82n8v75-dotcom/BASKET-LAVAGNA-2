export const COURT = { L: 28, W: 15, hoopX: 1.575, laneHalf: 2.45, ftX: 5.8, ftR: 1.8, threeR: 6.75, threeSide: 0.9, rimR: 0.225, centerR: 1.8, raR: 1.25, bbX: 1.2, bbHalf: 0.9 };
const M = 1.1;

export function makeView(w, h, mode, dpr = 1) {
  const full = mode === "full";
  const wx0 = -M, wx1 = full ? COURT.L + M : 14 + 0.5, wy0 = -M, wy1 = COURT.W + M;
  const spanX = wx1 - wx0, spanY = wy1 - wy0;
  const vertical = full ? h > w * 1.05 : true;
  const sw = vertical ? spanY : spanX, sh = vertical ? spanX : spanY;
  const s = Math.min(w / sw, h / sh);
  const ox = (w - sw * s) / 2, oy = (h - sh * s) / 2;
  const matrix = vertical
    ? { a: 0, b: s, c: s, d: 0, e: ox - wy0 * s, f: oy - wx0 * s }
    : { a: s, b: 0, c: 0, d: s, e: ox - wx0 * s, f: oy - wy0 * s };
  const toS = (p) => (vertical ? { x: ox + (p.y - wy0) * s, y: oy + (p.x - wx0) * s } : { x: ox + (p.x - wx0) * s, y: oy + (p.y - wy0) * s });
  const toW = (sx, sy) => (vertical ? { x: (sy - oy) / s + wx0, y: (sx - ox) / s + wy0 } : { x: (sx - ox) / s + wx0, y: (sy - oy) / s + wy0 });
  const clampW = (p) => ({ x: Math.min(wx1 - 0.3, Math.max(wx0 + 0.3, p.x)), y: Math.min(wy1 - 0.3, Math.max(wy0 + 0.3, p.y)) });
  return { w, h, s, dpr, vertical, mode, matrix, toS, toW, clampW, bounds: { wx0, wx1, wy0, wy1 } };
}

function seeded(seed) {
  let t = seed;
  return () => {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
}

const PLANKS = ["#E5C396", "#E9CA9F", "#E0BC8C", "#EDD4B2", "#DDB887", "#E3C092"];

function drawHalf(ctx, lw) {
  const C = COURT, cy = C.W / 2;
  ctx.fillStyle = "rgba(196,140,84,0.55)";
  ctx.fillRect(0, cy - C.laneHalf, C.ftX, C.laneHalf * 2);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = lw;
  ctx.strokeRect(0, cy - C.laneHalf, C.ftX, C.laneHalf * 2);
  ctx.beginPath();
  ctx.arc(C.ftX, cy, C.ftR, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.save();
  ctx.setLineDash([0.32, 0.26]);
  ctx.beginPath();
  ctx.arc(C.ftX, cy, C.ftR, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.stroke();
  ctx.restore();
  const phi = Math.asin((cy - C.threeSide) / C.threeR);
  const xJoin = C.hoopX + C.threeR * Math.cos(phi);
  ctx.beginPath();
  ctx.moveTo(0, C.threeSide);
  ctx.lineTo(xJoin, C.threeSide);
  ctx.arc(C.hoopX, cy, C.threeR, -phi, phi);
  ctx.lineTo(0, C.W - C.threeSide);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(C.hoopX, cy, C.raR, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  for (const d of [1.75, 2.6, 3.45]) {
    ctx.beginPath();
    ctx.moveTo(d, cy - C.laneHalf);
    ctx.lineTo(d, cy - C.laneHalf - 0.12);
    ctx.moveTo(d, cy + C.laneHalf);
    ctx.lineTo(d, cy + C.laneHalf + 0.12);
    ctx.stroke();
  }
  ctx.strokeStyle = "#1E293B";
  ctx.lineWidth = lw * 2.6;
  ctx.beginPath();
  ctx.moveTo(C.bbX, cy - C.bbHalf);
  ctx.lineTo(C.bbX, cy + C.bbHalf);
  ctx.stroke();
  ctx.lineWidth = lw * 1.2;
  ctx.beginPath();
  ctx.moveTo(C.bbX, cy);
  ctx.lineTo(C.hoopX - C.rimR, cy);
  ctx.stroke();
  ctx.strokeStyle = "#FF5722";
  ctx.lineWidth = lw * 1.5;
  ctx.beginPath();
  ctx.arc(C.hoopX, cy, C.rimR, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawCourt(ctx, view) {
  const { dpr, s, matrix: m, bounds } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#0B111C";
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.setTransform(dpr * m.a, dpr * m.b, dpr * m.c, dpr * m.d, dpr * m.e, dpr * m.f);
  const full = view.mode === "full";
  const xMax = full ? COURT.L : 14;
  ctx.fillStyle = "#B4834F";
  ctx.fillRect(bounds.wx0, bounds.wy0, bounds.wx1 - bounds.wx0, bounds.wy1 - bounds.wy0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, xMax, COURT.W);
  ctx.clip();
  const rnd = seeded(11);
  for (let y = 0; y < COURT.W; y += 0.24) {
    let x = -rnd() * 3;
    while (x < xMax) {
      const len = 2 + rnd() * 3.5;
      ctx.fillStyle = PLANKS[Math.floor(rnd() * PLANKS.length)];
      ctx.fillRect(x, y, len, 0.24);
      ctx.fillStyle = "rgba(110,70,30,0.12)";
      ctx.fillRect(x, y, 0.02, 0.24);
      x += len;
    }
    ctx.fillStyle = "rgba(110,70,30,0.08)";
    ctx.fillRect(0, y, xMax, 0.012);
  }
  const lw = Math.max(0.05, 1.8 / s);
  drawHalf(ctx, lw);
  if (full) {
    ctx.save();
    ctx.translate(COURT.L, 0);
    ctx.scale(-1, 1);
    drawHalf(ctx, lw);
    ctx.restore();
  }
  ctx.fillStyle = "rgba(196,140,84,0.45)";
  ctx.beginPath();
  ctx.arc(14, 7.5, COURT.centerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = lw * 1.4;
  ctx.strokeRect(0, 0, xMax, COURT.W);
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(14, COURT.W);
  ctx.stroke();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const courtCache = new Map();
export function courtImage(view) {
  const key = [view.w, view.h, view.mode, view.dpr, view.vertical].join("|");
  if (!courtCache.has(key)) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(view.w * view.dpr));
    c.height = Math.max(1, Math.round(view.h * view.dpr));
    drawCourt(c.getContext("2d"), view);
    if (courtCache.size > 16) courtCache.delete(courtCache.keys().next().value);
    courtCache.set(key, c);
  }
  return courtCache.get(key);
}
