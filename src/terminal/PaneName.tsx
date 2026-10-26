// A pane's name, shown in its header. Click to edit; Enter saves, Escape
// cancels, and saving a blank name clears it.

import { useState } from "react";

interface Props {
  name?: string;
  onRename: (name: string) => void;
}

export function PaneName({ name, onRename }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        className="bare-input h-5 min-w-0 flex-1 rounded bg-[var(--line-soft)] px-1.5 text-[11px] text-slate-100 outline-none"
        defaultValue={name ?? ""}
        placeholder="Name this terminal"
        onMouseDown={(e) => e.stopPropagation()}
        onBlur={(e) => {
          onRename(e.target.value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      className={`min-w-0 truncate rounded px-1.5 text-left text-[11px] leading-5 hover:bg-[var(--line-soft)] ${
        name ? "text-slate-300" : "text-slate-600 italic opacity-0 group-hover/pane:opacity-100"
      }`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => setEditing(true)}
      title="Click to rename this terminal"
    >
      {name ?? "name…"}
    </button>
  );
}
