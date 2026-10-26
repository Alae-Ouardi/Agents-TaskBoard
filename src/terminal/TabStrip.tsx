// The active folder's tabs: one per terminal or browser (each splittable),
// like the app's own tab bar. + opens a terminal or a browser tab.

import { useEffect, useRef, useState } from "react";
import { IconTerminal } from "../shared/icons";
import { useOverlay } from "../shared/overlay";
import { useTabDrag } from "../shared/tabDrag";
import { panes, tabLabel } from "./logic/layout";
import { terminalStore } from "./store";
import type { TermFolder, TermTab } from "./types";

const isBrowser = (t: TermTab) => panes(t.layout)[0]?.view === "browser";

function Globe({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

export function TabStrip({ folder }: { folder: TermFolder }) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const { strip, dragging, start } = useTabDrag((tabId, to) => terminalStore.moveTab(folder.id, tabId, to));
  const plus = useRef<HTMLDivElement>(null);
  // The menu drops over the panes: browser views must step aside.
  useOverlay(menu);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !plus.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <div ref={strip} className="flex h-9 shrink-0 items-end gap-1 border-b border-[var(--line)] bg-[var(--bg)] px-3">
      {folder.tabs.map((t, index) => {
        const active = t.id === folder.activeTab;
        const label = tabLabel(t, folder.tabs);
        const count = panes(t.layout).length;
        return (
          <div
            key={t.id}
            data-tab-id={t.id}
            onPointerDown={(e) => renaming !== t.id && start(e, t.id)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                terminalStore.closeTab(folder.id, t.id);
              } else if (e.button === 0) terminalStore.selectTab(folder.id, t.id);
            }}
            onDoubleClick={() => setRenaming(t.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setRenaming(t.id);
            }}
            title={`${label}${index < 9 ? `  (⌥⌘${index + 1})` : ""} — double-click or right-click to rename, drag to move`}
            className={`group relative flex h-7 max-w-[200px] min-w-[110px] cursor-default items-center gap-1.5 rounded-t-md border border-b-0 px-2 text-[11.5px] select-none ${
              active ? "border-[var(--line-strong)] bg-[#011627] text-slate-100" : "border-transparent text-slate-500 hover:bg-[var(--line-soft)] hover:text-slate-300"
            } ${dragging === t.id ? "opacity-50" : ""}`}
          >
            {active && <span className="absolute inset-x-2 top-0 h-[2px] rounded-full bg-sky-400/80" />}
            <span className={active ? "text-sky-300" : ""}>{isBrowser(t) ? <Globe /> : <IconTerminal size={12} />}</span>
            {renaming === t.id ? (
              <input
                autoFocus
                className="bare-input min-w-0 flex-1 bg-transparent text-[11.5px] text-slate-100 outline-none"
                defaultValue={t.title ?? label}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  terminalStore.renameTab(folder.id, t.id, e.target.value === label && !t.title ? "" : e.target.value);
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <span className="min-w-0 flex-1 truncate">{label}</span>
            )}
            {count > 1 && <span className="num text-[9.5px] text-slate-500">{count}</span>}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => terminalStore.closeTab(folder.id, t.id)}
              className={`rounded px-1 leading-none text-slate-500 hover:bg-[var(--line)] hover:text-slate-100 ${active ? "" : "opacity-0 group-hover:opacity-100"}`}
              title="Close tab"
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        );
      })}
      <div ref={plus} className="relative mb-1">
        <button
          onClick={() => setMenu((m) => !m)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[15px] text-slate-500 hover:bg-[var(--line-soft)] hover:text-slate-200"
          title="New tab (⌥⌘T terminal, ⌥⌘B browser)"
          aria-label="New folder tab"
        >
          +
        </button>
        {menu && (
          <div className="absolute top-7 left-0 z-30 w-44 overflow-hidden rounded-lg border border-[var(--line-strong)] bg-[var(--panel-solid)] py-1 text-[12px] shadow-xl">
            {(
              [
                ["terminal", "Terminal", "⌥⌘T"],
                ["browser", "Browser", "⌥⌘B"],
              ] as const
            ).map(([view, label, keys]) => (
              <button
                key={view}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-300 hover:bg-[var(--line)]"
                onClick={() => {
                  setMenu(false);
                  terminalStore.addTab(folder.id, view);
                }}
              >
                {view === "browser" ? <Globe /> : <IconTerminal size={12} />}
                <span className="flex-1">{label}</span>
                <kbd className="num text-[10px] text-slate-500">{keys}</kbd>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
