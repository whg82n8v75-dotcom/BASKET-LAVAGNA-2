import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadPlays, savePlays, loadSettings, saveSettings } from "./storage";
import { clonePlay, createPlay } from "./model";

const Ctx = createContext(null);

export function PlaysProvider({ children }) {
  const [plays, setPlays] = useState(loadPlays);
  const [settings, setSettings] = useState(loadSettings);
  const [savedAt, setSavedAt] = useState(null);
  const playsRef = useRef(plays);
  const timer = useRef(null);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    if (savePlays(playsRef.current)) setSavedAt(Date.now());
  }, []);

  useEffect(() => {
    playsRef.current = plays;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 350);
  }, [plays, flush]);

  useEffect(() => {
    const onHide = () => timer.current && flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    navigator.storage?.persist?.().catch(() => {});
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  useEffect(() => saveSettings(settings), [settings]);

  const api = useMemo(
    () => ({
      plays, settings, savedAt,
      getPlay: (id) => plays.find((p) => p.id === id),
      upsertPlay: (p) => setPlays((list) => {
        const next = { ...p, updatedAt: new Date().toISOString() };
        const i = list.findIndex((x) => x.id === p.id);
        if (i < 0) return [next, ...list];
        const copy = [...list];
        copy[i] = next;
        return copy;
      }),
      newPlay: (opts) => {
        const p = createPlay({ courtMode: settings.courtMode, duration: settings.duration, ...opts });
        setPlays((l) => [p, ...l]);
        return p;
      },
      copyPlay: (src, name) => {
        const p = clonePlay(src, name);
        setPlays((l) => [p, ...l]);
        return p;
      },
      deletePlay: (id) => setPlays((l) => l.filter((p) => p.id !== id)),
      importPlays: (list) => setPlays((l) => [...list, ...l]),
      clearAll: () => setPlays([]),
      updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
    }),
    [plays, settings, savedAt],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const usePlays = () => useContext(Ctx);
