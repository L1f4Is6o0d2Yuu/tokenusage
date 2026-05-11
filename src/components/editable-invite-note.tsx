"use client";

import { useRef, useState, useTransition } from "react";
import { updateInviteNoteAction } from "@/app/(app)/users/actions";
import { Pencil } from "lucide-react";

// Two-state cell: hover/click-to-edit. Click the pencil to enter edit
// mode; submit (Enter) or blur to save; Escape to cancel. We keep the
// network call inside a transition so the surrounding row stays
// responsive while the server action revalidates.
export function EditableInviteNote({
  id,
  note,
  placeholder,
  editLabel,
}: {
  id: number;
  note: string | null;
  placeholder: string;
  editLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    if (value === (note ?? "")) {
      setEditing(false);
      return;
    }
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("note", value);
    startTransition(async () => {
      await updateInviteNoteAction(fd);
      setEditing(false);
    });
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        autoFocus
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            setValue(note ?? "");
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded border border-accent/40 bg-bg-input px-2 py-1 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={editLabel}
      aria-label={editLabel}
      className="group/note flex w-full items-center gap-1.5 text-left font-medium hover:text-accent"
    >
      <span className={note ? "" : "italic text-fg-faint"}>
        {note ?? placeholder}
      </span>
      <Pencil
        className="h-3 w-3 opacity-0 transition-opacity group-hover/note:opacity-100"
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
}
