window.__ghostPx = () => {
  const c = document.querySelector('[data-testid=court-canvas]');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (b > 225 && g > 180 && g < 235 && r > 120 && r < 210 && b - r > 35) n++;
  }
  return n;
};
window.__w2s = (x, y) => {
  const c = document.querySelector('[data-testid=court-canvas]');
  const r = c.getBoundingClientRect();
  const w = Math.floor(r.width), h = Math.floor(r.height);
  const s = Math.min(w / 17.2, h / 15.6);
  const ox = (w - 17.2 * s) / 2, oy = (h - 15.6 * s) / 2;
  return { x: r.left + ox + (y + 1.1) * s, y: r.top + oy + (x + 1.1) * s, s };
};
