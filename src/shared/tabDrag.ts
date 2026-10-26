// Tab reordering by pointer, shared by the app's tab bar and the terminal's
// tab strip. HTML drag-and-drop is not used: the native window intercepts it
// on Windows, so tabs follow pointer events instead.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/** Pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 4;

/** Where a dragged tab lands: the number of other tabs whose centre is left of `x`. */
export function dropIndex(otherCentres: readonly number[], x: number): number {
  return otherCentres.filter((c) => c < x).length;
}

/**
 * Tabs must carry `data-tab-id` and sit inside `strip`. Call `start` from a
 * tab's onPointerDown; `onMove(id, index)` fires as the tab crosses others.
 */
export function useTabDrag(onMove: (id: string, toIndex: number) => void) {
  const strip = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const latest = useRef(onMove);
  latest.current = onMove;

  function start(e: ReactPointerEvent, id: string) {
    if (e.button !== 0) return;
    const startX = e.clientX;
    let active = false;
    let last = -1;

    const move = (ev: PointerEvent) => {
      if (!active && Math.abs(ev.clientX - startX) < DRAG_THRESHOLD) return;
      if (!active) {
        active = true;
        setDragging(id);
      }
      const others = Array.from(strip.current?.querySelectorAll<HTMLElement>("[data-tab-id]") ?? [])
        .filter((el) => el.dataset.tabId !== id)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return r.left + r.width / 2;
        });
      const to = dropIndex(others, ev.clientX);
      if (to !== last) {
        last = to;
        latest.current(id, to);
      }
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setDragging(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  return { strip, dragging, start };
}
