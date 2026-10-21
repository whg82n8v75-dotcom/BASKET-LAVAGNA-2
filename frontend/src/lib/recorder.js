import { makeView } from "./court";
import { drawScene } from "./render";
import { buildTimeline, frameAt, phaseScene } from "./engine";

export function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  const list = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return list.find((m) => MediaRecorder.isTypeSupported?.(m)) || null;
}

const dims = (mode) => (mode === "full" ? [1280, 720] : [960, 880]);

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.style.cssText = "position:fixed;left:-99999px;top:0;pointer-events:none";
  document.body.appendChild(c);
  return c;
}

export function recordPlay(play, { speed = 1, size = 1, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const mime = pickMime();
    const [W, H] = dims(play.courtMode);
    const canvas = makeCanvas(W, H);
    if (!mime || !canvas.captureStream) {
      canvas.remove();
      reject(new Error("unsupported"));
      return;
    }
    const ctx = canvas.getContext("2d");
    const view = makeView(W, H, play.courtMode, 1);
    const tl = buildTimeline(play);
    const n = play.phases.length;
    const draw = (T) => {
      const fr = frameAt(play, tl, T, true);
      drawScene(ctx, view, play, fr, { size: size * 1.1, title: `${play.name}  ·  Fase ${Math.min(n, fr.phaseIndex + 1)}/${n}` });
    };
    draw(0);
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      canvas.remove();
      stream.getTracks().forEach((t) => t.stop());
      if (signal?.aborted) return reject(new Error("aborted"));
      resolve({ blob: new Blob(chunks, { type: mime.split(";")[0] }), ext: mime.includes("mp4") ? "mp4" : "webm" });
    };
    rec.start(200);
    const t0 = performance.now();
    const end = tl.total + 0.6;
    const loop = (now) => {
      const T = ((now - t0) / 1000) * speed;
      draw(Math.min(T, tl.total - 0.001));
      onProgress?.(Math.min(1, T / end));
      if (signal?.aborted || T >= end) rec.stop();
      else requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

const toBlob = (c) => new Promise((r) => c.toBlob(r, "image/png"));

export async function phasePNG(play, i, size = 1) {
  const [W, H] = dims(play.courtMode).map((v) => Math.round(v * 1.25));
  const c = makeCanvas(W, H);
  drawScene(c.getContext("2d"), makeView(W, H, play.courtMode, 1), play, phaseScene(play, i), { size: size * 1.2, title: `${play.name}  ·  Fase ${i + 1}` });
  const b = await toBlob(c);
  c.remove();
  return b;
}

export async function framesSheetPNG(play, size = 1) {
  const [cw, ch] = dims(play.courtMode).map((v) => Math.round(v * 0.62));
  const n = play.phases.length, cols = Math.min(3, n), rows = Math.ceil(n / cols), head = 70, gap = 16;
  const W = cols * cw + (cols + 1) * gap, H = head + rows * (ch + 34) + (rows + 1) * gap;
  const sheet = makeCanvas(W, H);
  const ctx = sheet.getContext("2d");
  ctx.fillStyle = "#090D14";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '800 34px "Barlow Condensed", sans-serif';
  ctx.textBaseline = "middle";
  ctx.fillText(play.name.toUpperCase(), gap + 4, head / 2 + 6);
  const cell = makeCanvas(cw, ch);
  const cctx = cell.getContext("2d");
  const view = makeView(cw, ch, play.courtMode, 1);
  play.phases.forEach((ph, i) => {
    drawScene(cctx, view, play, phaseScene(play, i), { size: size * 0.9 });
    const x = gap + (i % cols) * (cw + gap), y = head + gap + Math.floor(i / cols) * (ch + 34 + gap);
    ctx.fillStyle = "#F59E0B";
    ctx.font = '700 22px "Barlow Condensed", sans-serif';
    ctx.fillText(`FASE ${i + 1}${ph.label ? " · " + ph.label : ""}`, x, y + 14);
    ctx.drawImage(cell, x, y + 30, cw, ch);
  });
  const b = await toBlob(sheet);
  sheet.remove();
  cell.remove();
  return b;
}

const mmOf = (play, i) => Object.fromEntries((play.phases[i]?.defInfo?.mismatches || []).map((m) => [m.d, m.kind]));

export function recordCompare(pa, pb, labels, { speed = 1, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const mime = pickMime();
    const full = pa.courtMode === "full";
    const pw = full ? 940 : 860, ph = full ? 540 : 790, head = 70, foot = 46, gap = 20;
    const W = pw * 2 + gap * 3, H = head + ph + foot + gap;
    const canvas = makeCanvas(W, H);
    if (!mime || !canvas.captureStream) {
      canvas.remove();
      reject(new Error("unsupported"));
      return;
    }
    const panes = [pa, pb].map((p) => ({ p, c: makeCanvas(pw, ph), view: makeView(pw, ph, p.courtMode, 1), tl: buildTimeline(p) }));
    const total = Math.max(...panes.map((x) => x.tl.total));
    const ctx = canvas.getContext("2d");
    const draw = (T) => {
      ctx.fillStyle = "#090D14";
      ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = "middle";
      panes.forEach((x, k) => {
        const fr = frameAt(x.p, x.tl, Math.min(T, x.tl.total - 0.001), true);
        drawScene(x.c.getContext("2d"), x.view, x.p, fr, { size: 1.05, mismatch: mmOf(x.p, fr.phaseIndex) });
        const left = gap + k * (pw + gap);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = k ? "#38BDF8" : "#F59E0B";
        ctx.fillRect(left, 18, 6, 34);
        ctx.fillStyle = "#F8FAFC";
        ctx.font = '800 30px "Barlow Condensed", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText(`${k ? "B" : "A"} · ${labels[k]}`.toUpperCase(), left + 16, 36);
        ctx.drawImage(x.c, left, head, pw, ph);
        const info = x.p.phases[fr.phaseIndex]?.defInfo;
        ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = "#CBD5E1";
        const note = info?.notes?.find((n) => /Cambio|sopra|sotto|drop|Show|Aiuto|Mismatch|zona/.test(n)) || info?.notes?.[0] || "";
        ctx.fillText(`Fase ${fr.phaseIndex + 1}: ${note}`.slice(0, 92), left, head + ph + foot / 2 + 4);
      });
      ctx.textAlign = "right";
      ctx.fillStyle = "#94A3B8";
      ctx.font = '700 22px "Barlow Condensed", sans-serif';
      ctx.fillText(pa.name.toUpperCase(), W - gap, 36);
    };
    draw(0);
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 7_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      canvas.remove();
      panes.forEach((x) => x.c.remove());
      stream.getTracks().forEach((t) => t.stop());
      if (signal?.aborted) return reject(new Error("aborted"));
      resolve({ blob: new Blob(chunks, { type: mime.split(";")[0] }), ext: mime.includes("mp4") ? "mp4" : "webm" });
    };
    rec.start(200);
    const t0 = performance.now(), end = total + 0.8;
    const loop = (now) => {
      const T = ((now - t0) / 1000) * speed;
      draw(Math.min(T, total - 0.001));
      onProgress?.(Math.min(1, T / end));
      if (signal?.aborted || T >= end) rec.stop();
      else requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
