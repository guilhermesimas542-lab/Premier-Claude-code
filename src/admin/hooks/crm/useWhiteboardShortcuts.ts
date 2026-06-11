import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Atalhos de teclado pro whiteboard:
 * - Barra de espaço pressionada → modo pan (mover o mapa). Solta → modo seleção.
 * - Ctrl/Cmd + Z → undo (chama callback fornecido).
 *
 * Também expõe uma pilha de snapshots genérica pra histórico.
 */
export function useWhiteboardShortcuts<T = unknown>(opts: {
  onUndo: (snapshot: T) => void | Promise<void>;
}) {
  const { onUndo } = opts;
  const [isPanMode, setIsPanMode] = useState(false);
  const historyRef = useRef<T[]>([]);

  const pushHistory = useCallback((snapshot: T) => {
    historyRef.current.push(snapshot);
    // limita pra evitar memory bloat
    if (historyRef.current.length > 100) historyRef.current.shift();
  }, []);

  const undo = useCallback(async () => {
    const snap = historyRef.current.pop();
    if (snap === undefined) return;
    await onUndo(snap);
  }, [onUndo]);

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsPanMode(true);
        return;
      }
      const meta = e.ctrlKey || e.metaKey;
      if (meta && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        void undo();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsPanMode(false);
    };
    const onBlur = () => setIsPanMode(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [undo]);

  return { isPanMode, pushHistory, undo };
}
