import { isValidPlay, uid } from "./model";

const PLAYS_KEY = "btm.plays.v1";
const SETTINGS_KEY = "btm.settings.v1";

export const DEFAULT_SETTINGS = { courtMode: "half", playerSize: 1, ghost: true, showLines: true, duration: 1.6, speed: 1, loop: false };

export function loadPlays() {
  try {
    const raw = JSON.parse(localStorage.getItem(PLAYS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(isValidPlay) : [];
  } catch {
    return [];
  }
}

export function savePlays(plays) {
  try {
    localStorage.setItem(PLAYS_KEY, JSON.stringify(plays));
    return true;
  } catch {
    return false;
  }
}

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const saveSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  if (isIOS() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const safeName = (s) => (s || "schema").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "schema";

export function exportPlaysJSON(plays, filename) {
  const data = { app: "basket-tactics-motion", version: 1, exportedAt: new Date().toISOString(), plays };
  return shareOrDownload(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}

export async function readPlaysFile(file) {
  const data = JSON.parse(await file.text());
  const list = Array.isArray(data) ? data : Array.isArray(data.plays) ? data.plays : [data];
  const valid = list.filter(isValidPlay);
  if (!valid.length) throw new Error("Nessuno schema valido nel file");
  const now = new Date().toISOString();
  return valid.map((p) => ({ hidden: { O: false, D: false, ball: false }, category: "attacco", courtMode: "half", ...p, id: uid(), updatedAt: now, createdAt: p.createdAt || now }));
}
