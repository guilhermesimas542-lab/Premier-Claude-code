import { useEffect, useRef, useCallback } from "react";

/**
 * Atalho de teclado: Ctrl/Cmd+Z → undo.
 * (O modo pan agora é controlado pela toolbar, não mais por Space.)
 */
export function useWhiteboardShortcuts<T = unknown>(opts: {
  onUndo: (snapshot: T) => void | Promise<void>;
}) {
  const { onUndo } = opts;
  const historyRef = useRef<T[]>([]);

  const pushHistory = useCallback((snapshot: T) => {
    historyRef.current.push(snapshot);
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
      const meta = e.ctrlKey || e.metaKey;
      if (meta && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        void undo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo]);

  return { isPanMode: false, pushHistory, undo };
}
