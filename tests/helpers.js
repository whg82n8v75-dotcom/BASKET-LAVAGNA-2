window.__sp = (pid, phase = 0) => {
  const id = location.pathname.split('/').pop();
  const plays = JSON.parse(localStorage.getItem('btm.plays.v1') || '[]');
  const play = plays.find((p) => p.id === id);
  if (!play) return null;
  const c = document.querySelector('[data-testid=court-canvas]');
  const r = c.getBoundingClientRect();
  const w = Math.floor(r.width), h = Math.floor(r.height);
  const full = play.courtMode === 'full'; const M = 1.1;
  const wx0 = -M, wx1 = full ? 29.1 : 14.5, wy0 = -M, wy1 = 16.1;
  const spanX = wx1 - wx0, spanY = wy1 - wy0; const vertical = full ? h > w * 1.05 : true;
  const sw = vertical ? spanY : spanX, sh = vertical ? spanX : spanY; const s = Math.min(w / sw, h / sh);
  const ox = (w - sw * s) / 2, oy = (h - sh * s) / 2;
  const p = play.phases[phase].positions[pid];
  if (!p) return null;
  const sx = vertical ? ox + (p.y - wy0) * s : ox + (p.x - wx0) * s;
  const sy = vertical ? oy + (p.x - wx0) * s : oy + (p.y - wy0) * s;
  return { x: r.left + sx, y: r.top + sy, s };
};
window.__play = () => {
  const id = location.pathname.split('/').pop();
  return JSON.parse(localStorage.getItem('btm.plays.v1') || '[]').find((p) => p.id === id);
};
window.__hash = () => {
  const d = document.querySelector('[data-testid=court-canvas]').toDataURL();
  let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d.charCodeAt(i)) | 0; return h;
};
