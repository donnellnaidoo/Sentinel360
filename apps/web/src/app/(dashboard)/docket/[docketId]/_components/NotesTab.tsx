"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

export function NotesTab({ caseId }: { caseId: string }) {
  const [noteContent, setNoteContent] = useState("");
  const notesQuery = useQuery(trpc.cases.listNotes.queryOptions({ caseId }));

  const addNote = useMutation(
    trpc.cases.addNote.mutationOptions({
      onSuccess: () => {
        setNoteContent("");
        queryClient.invalidateQueries({ queryKey: trpc.cases.listNotes.queryKey({ caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.timeline.queryKey({ caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.nextActions.queryKey({ caseId }) });
      },
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-low"
          placeholder="Add an investigation note..."
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
        />
        <button
          disabled={!noteContent.trim() || addNote.isPending}
          onClick={() => addNote.mutate({ caseId, noteType: "GENERAL", content: noteContent })}
          className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {notesQuery.isLoading && <p className="text-sm text-on-surface-variant">Loading notes...</p>}
      {notesQuery.data?.length === 0 && (
        <p className="text-sm text-on-surface-variant">No notes yet.</p>
      )}
      <div className="space-y-3">
        {notesQuery.data?.map((note) => (
          <div
            key={note.id}
            className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30"
          >
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold uppercase">{note.noteType}</span>
              <span className="text-[10px] text-on-surface-variant">
                {new Date(note.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-on-surface">{note.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
